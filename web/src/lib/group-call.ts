import { useCallback, useEffect, useRef, useState } from "react";
import type { JurorTag } from "@/lib/voice";

/**
 * The group defence as a call: the student who started the rehearsal hosts
 * it, and the classmates presenting with them join from a link.
 *
 * The cameras and voices go device to device over WebRTC; the server only
 * passes the handshakes along (see src/call-rooms.ts). The jury runs on the
 * host's device as it always has, and the host publishes what the room looks
 * like — whose turn, which juror is talking, the question on screen — for the
 * others to mirror. A classmate's spoken answer travels back the same way and
 * the host files it as the turn.
 */

export interface CallSeat {
  roomId: string;
  participantId: string;
  key: string;
  iceServers: RTCIceServer[];
}

export interface CallParticipant {
  id: string;
  name: string;
  role: "host" | "guest";
}

/** What the host's screen shows, for everyone else's to match. */
export interface RoomState {
  university: string;
  jurors: Record<JurorTag, { name: string; title: string }>;
  /** Who on the panel holds the floor, from the turn on screen. */
  juror: JurorTag;
  /** Whether the jury is talking right now. */
  juryTalking: boolean;
  /** The question on screen, with the jurors' names already in. */
  turnText: string;
  /** "Turno 2 de 5". */
  status: string;
  /** When the floor passed to the group, for the clock; null while the jury talks. */
  floorSince: number | null;
  floorSeconds: number;
  floorLabel: string;
  complete: boolean;
  /** Whether the jury's voice reaches the others through the call. */
  juryAudio: boolean;
  bcp47: string;
  /** Who is answering right now, by participant id. */
  answering: string | null;
}

interface CallMessage {
  seq: number;
  from: string;
  type: "offer" | "answer" | "ice" | "say" | "bye";
  payload: unknown;
}

interface PollResult {
  you: CallParticipant;
  participants: CallParticipant[];
  messages: CallMessage[];
  state?: RoomState | null;
  stateVersion: number;
  cursor: number;
}

export class CallError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new CallError(response.status, String(data["code"] ?? ""), String(data["error"] ?? "The call failed."));
  }
  return data as T;
}

/** Opens a room for this rehearsal. Signed in: the host is the account running it. */
export function openCallRoom(members: string[], name: string): Promise<CallSeat> {
  return call<CallSeat>("/api/call", { members, name });
}

export function previewCallRoom(roomId: string): Promise<{ hostName: string; members: string[]; full: boolean }> {
  return call(`/api/call/${encodeURIComponent(roomId)}`);
}

export function joinCallRoom(roomId: string, name: string): Promise<CallSeat> {
  return call<CallSeat>(`/api/call/${encodeURIComponent(roomId)}/join`, { name });
}

export function callInviteUrl(roomId: string): string {
  return `${window.location.origin}/llamada/${roomId}`;
}

const POLL_MS = 900;

interface Peer {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  senders: Map<string, RTCRtpSender>;
  stream: MediaStream;
}

/**
 * Joins the room with a seat and keeps everyone connected.
 *
 * Every pair of participants gets its own connection — at three people that
 * is three links, which is what a mesh is good for. Negotiation follows the
 * "perfect negotiation" pattern: either side may renegotiate (a camera turned
 * on halfway through), and when both do at once the polite side yields.
 */
export function useGroupCall({
  seat,
  tracks,
  onSay,
  onState,
}: {
  seat: CallSeat | null;
  /** What this device sends: camera, microphone, and on the host the jury's voice. */
  tracks: MediaStreamTrack[];
  /** A classmate's spoken answer, delivered to the host. */
  onSay?: (from: CallParticipant, text: string) => void;
  /** The host's view of the room, delivered to everyone else. */
  onState?: (state: RoomState) => void;
}) {
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [gone, setGone] = useState(false);
  const peers = useRef(new Map<string, Peer>());
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const handlers = useRef({ onSay, onState });
  handlers.current = { onSay, onState };
  const roster = useRef<CallParticipant[]>([]);
  const lastState = useRef("");

  const send = useCallback(
    (to: string, type: CallMessage["type"], payload: unknown) => {
      if (!seat) return Promise.resolve();
      return call(`/api/call/${seat.roomId}/signal`, {
        participantId: seat.participantId,
        key: seat.key,
        to,
        type,
        payload,
      }).catch(() => undefined);
    },
    [seat],
  );

  const refreshRemotes = useCallback(() => {
    const next: Record<string, MediaStream> = {};
    for (const [id, peer] of peers.current) next[id] = peer.stream;
    setRemotes(next);
  }, []);

  /** Sends exactly the current tracks on one connection. */
  const syncTracks = useCallback((peer: Peer) => {
    const wanted = new Map(tracksRef.current.map((track) => [track.id, track]));
    for (const [id, sender] of peer.senders) {
      if (!wanted.has(id)) {
        try {
          peer.pc.removeTrack(sender);
        } catch {
          // Already closed.
        }
        peer.senders.delete(id);
      }
    }
    for (const [id, track] of wanted) {
      if (peer.senders.has(id)) continue;
      try {
        peer.senders.set(id, peer.pc.addTrack(track, new MediaStream([track])));
      } catch {
        // Closed mid-way; the next roster change rebuilds it.
      }
    }
  }, []);

  const connect = useCallback(
    (other: CallParticipant): Peer | null => {
      if (!seat) return null;
      const existing = peers.current.get(other.id);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: seat.iceServers });
      const peer: Peer = {
        pc,
        // Deterministic and agreed by both ends without asking.
        polite: seat.participantId > other.id,
        makingOffer: false,
        ignoreOffer: false,
        senders: new Map(),
        stream: new MediaStream(),
      };
      peers.current.set(other.id, peer);
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) void send(other.id, "ice", candidate.toJSON());
      };
      pc.onnegotiationneeded = async () => {
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          await send(other.id, "offer", pc.localDescription?.toJSON());
        } catch {
          // The next negotiation retries.
        } finally {
          peer.makingOffer = false;
        }
      };
      pc.ontrack = ({ track }) => {
        peer.stream.addTrack(track);
        track.onended = () => {
          peer.stream.removeTrack(track);
          refreshRemotes();
        };
        // A fresh stream object, so React sees the change and the tile
        // re-binds its element.
        peer.stream = new MediaStream(peer.stream.getTracks());
        refreshRemotes();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") pc.restartIce();
      };
      syncTracks(peer);
      // Someone with neither camera nor microphone still has to see and hear
      // the others, and with nothing to send no negotiation would ever start.
      if (peer.senders.size === 0 && !peer.polite) {
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.addTransceiver("video", { direction: "recvonly" });
      }
      refreshRemotes();
      return peer;
    },
    [seat, send, syncTracks, refreshRemotes],
  );

  const drop = useCallback(
    (id: string) => {
      const peer = peers.current.get(id);
      if (!peer) return;
      peer.pc.close();
      peers.current.delete(id);
      refreshRemotes();
    },
    [refreshRemotes],
  );

  const receive = useCallback(
    async (message: CallMessage) => {
      if (message.type === "say") {
        const from = roster.current.find((entry) => entry.id === message.from);
        const text = (message.payload as { text?: unknown } | null)?.text;
        if (from && typeof text === "string" && text.trim() !== "") handlers.current.onSay?.(from, text.trim());
        return;
      }
      if (message.type === "bye") {
        drop(message.from);
        return;
      }
      const other = roster.current.find((entry) => entry.id === message.from) ?? {
        id: message.from,
        name: "",
        role: "guest" as const,
      };
      const peer = connect(other);
      if (!peer) return;
      const { pc } = peer;
      try {
        if (message.type === "offer" || message.type === "answer") {
          const description = message.payload as RTCSessionDescriptionInit;
          const collision = description.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
          peer.ignoreOffer = !peer.polite && collision;
          if (peer.ignoreOffer) return;
          await pc.setRemoteDescription(description);
          if (description.type === "offer") {
            await pc.setLocalDescription();
            await send(message.from, "answer", pc.localDescription?.toJSON());
          }
        } else if (message.type === "ice") {
          try {
            await pc.addIceCandidate(message.payload as RTCIceCandidateInit);
          } catch (error) {
            if (!peer.ignoreOffer) throw error;
          }
        }
      } catch {
        // One bad message is not the end of the call; ICE restarts recover.
      }
    },
    [connect, drop, send],
  );

  // The loop: ask what happened, act on it, ask again.
  useEffect(() => {
    if (!seat) return;
    let stopped = false;
    let timer = 0;
    let cursor = 0;
    let stateVersion = -1;
    const tick = async () => {
      try {
        const result = await call<PollResult>(`/api/call/${seat.roomId}/poll`, {
          participantId: seat.participantId,
          key: seat.key,
          since: cursor,
          stateVersion,
        });
        if (stopped) return;
        cursor = result.cursor;
        stateVersion = result.stateVersion;
        const others = result.participants.filter((entry) => entry.id !== seat.participantId);
        roster.current = others;
        setParticipants(others);
        for (const id of [...peers.current.keys()]) {
          if (!others.some((entry) => entry.id === id)) drop(id);
        }
        // The lower id starts each link; the other end answers.
        for (const other of others) if (seat.participantId < other.id) connect(other);
        for (const message of result.messages) await receive(message);
        if (result.state) handlers.current.onState?.(result.state);
      } catch (error) {
        if (error instanceof CallError && (error.status === 404 || error.status === 403)) {
          setGone(true);
          return;
        }
      }
      if (!stopped) timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [seat, connect, drop, receive]);

  // Tracks come and go — a camera turned on, the jury's voice joining.
  const trackKey = tracks.map((track) => track.id).join(",");
  useEffect(() => {
    for (const peer of peers.current.values()) syncTracks(peer);
  }, [trackKey, syncTracks]);

  // Closing the tab or leaving the screen ends this end of every link.
  // Deferred a tick: React's development double-mount runs this cleanup and
  // the effect again at once, and leaving for real there would close the
  // room the moment it opened.
  const pendingLeave = useRef(0);
  useEffect(() => {
    if (!seat) return;
    window.clearTimeout(pendingLeave.current);
    const leave = () => {
      void fetch(`/api/call/${seat.roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: seat.participantId, key: seat.key }),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", leave);
    const open = peers.current;
    return () => {
      window.removeEventListener("pagehide", leave);
      for (const peer of open.values()) peer.pc.close();
      open.clear();
      pendingLeave.current = window.setTimeout(leave, 0);
    };
  }, [seat]);

  /** Host only: what the room looks like now. Sent only when it changed. */
  const publish = useCallback(
    (state: RoomState) => {
      if (!seat) return;
      const serialised = JSON.stringify(state);
      if (serialised === lastState.current) return;
      lastState.current = serialised;
      void call(`/api/call/${seat.roomId}/state`, {
        participantId: seat.participantId,
        key: seat.key,
        state,
      }).catch(() => {
        lastState.current = "";
      });
    },
    [seat],
  );

  /** Guest only: a spoken answer, for the host to file as the turn. */
  const say = useCallback(
    (text: string) => {
      const host = roster.current.find((entry) => entry.role === "host");
      if (host) void send(host.id, "say", { text });
    },
    [send],
  );

  return { participants, remotes, publish, say, gone };
}

/** Two letters for a tile without a camera. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/^Dra?\.\s*/, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "…";
  return (words.length === 1 ? words[0]!.slice(0, 2) : `${words[0]![0]}${words[1]![0]}`).toUpperCase();
}
