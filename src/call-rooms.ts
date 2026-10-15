/**
 * The group defence as a call: the student who started the rehearsal and the
 * classmates presenting with them, each on their own device.
 *
 * The server is only the switchboard. The interview itself still runs in the
 * host's browser against the host's session — the jury, the turns, the voice —
 * and what passes through here is three small things: the host's view of the
 * room (the turn on screen, who on the jury is talking) for the others to
 * mirror, the WebRTC handshakes that let the cameras reach each other
 * directly, and a classmate's spoken answer on its way to the host, who files
 * it as a turn. No video ever touches the server.
 *
 * Rooms live in memory. A call lasts as long as a rehearsal, the service runs
 * as one instance, and losing the rooms on a deploy costs a re-join, not data.
 *
 * The room id in the invitation link is the capability to join, and the key
 * each participant gets back is the capability to act as that participant.
 * Neither is an account: a classmate presenting with you should not need to
 * sign up to be seen.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";

/** A rehearsal is an hour at most; the room outlives it comfortably. */
export const ROOM_TTL_MS = 3 * 60 * 60 * 1000;
/** A group thesis is two or three people: the host and up to two more. */
export const MAX_GUESTS = 2;
/** Gone from the room once their device has not asked for this long. */
export const OFFLINE_AFTER_MS = 12_000;
/** Per participant, so a peer that never polls cannot grow the heap. */
export const MAILBOX_CAP = 400;
/** The host's view of the room, serialised. Text and a few flags. */
export const MAX_STATE_CHARS = 24_000;
/** An SDP offer is a few kilobytes; a spoken answer, a few sentences. */
export const MAX_PAYLOAD_CHARS = 24_000;
export const MAX_NAME_CHARS = 60;

export const SIGNAL_TYPES = ["offer", "answer", "ice", "say", "bye"] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export interface CallMessage {
  seq: number;
  from: string;
  type: SignalType;
  payload: unknown;
}

interface Participant {
  id: string;
  key: string;
  name: string;
  role: "host" | "guest";
  lastSeen: number;
}

interface Room {
  id: string;
  hostAccount: string;
  /** The rehearsal this call carries, for the report the members read at the end. */
  sessionId: string | null;
  /** The host has left: the call is over, the room stays for the report. */
  ended: boolean;
  members: string[];
  createdAt: number;
  participants: Map<string, Participant>;
  state: unknown;
  stateVersion: number;
  mailbox: Map<string, CallMessage[]>;
  seq: number;
}

export interface Joined {
  roomId: string;
  participantId: string;
  key: string;
}

export interface PublicParticipant {
  id: string;
  name: string;
  role: "host" | "guest";
}

export class CallRoomError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const token = (bytes: number) => randomBytes(bytes).toString("base64url");

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_CHARS) : "";
}

export class CallRooms {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Opens a room for a group defence. The host is its first participant. */
  create(hostAccount: string, members: unknown, hostName: unknown, sessionId: unknown = null): Joined {
    this.sweep();
    const names = Array.isArray(members) ? members.map(cleanName).filter(Boolean).slice(0, MAX_GUESTS + 1) : [];
    const host: Participant = {
      id: token(9),
      key: token(24),
      name: cleanName(hostName) || names[0] || "Host",
      role: "host",
      lastSeen: this.now(),
    };
    const room: Room = {
      id: token(16),
      hostAccount,
      sessionId: typeof sessionId === "string" && /^[\w-]{1,100}$/.test(sessionId) ? sessionId : null,
      ended: false,
      members: names,
      createdAt: this.now(),
      participants: new Map([[host.id, host]]),
      state: null,
      stateVersion: 0,
      mailbox: new Map([[host.id, []]]),
      seq: 0,
    };
    this.rooms.set(room.id, room);
    return { roomId: room.id, participantId: host.id, key: host.key };
  }

  /** What the invitation page shows before anyone joins. */
  preview(roomId: string): { hostName: string; members: string[]; full: boolean } {
    const room = this.room(roomId);
    const host = [...room.participants.values()].find((entry) => entry.role === "host");
    return { hostName: host?.name ?? "", members: room.members, full: this.guests(room).length >= MAX_GUESTS };
  }

  join(roomId: string, name: unknown): Joined {
    const room = this.room(roomId);
    if (room.ended) throw new CallRoomError(404, "roomGone", "This call has ended or the link is wrong.");
    const cleaned = cleanName(name);
    if (!cleaned) throw new CallRoomError(400, "nameRequired", "Say who is joining.");
    if (this.guests(room).length >= MAX_GUESTS) {
      throw new CallRoomError(409, "roomFull", "This call already has everyone in it.");
    }
    const guest: Participant = { id: token(9), key: token(24), name: cleaned, role: "guest", lastSeen: this.now() };
    room.participants.set(guest.id, guest);
    room.mailbox.set(guest.id, []);
    return { roomId: room.id, participantId: guest.id, key: guest.key };
  }

  /** The host's view of the room, for everyone else to mirror. */
  publish(roomId: string, participantId: unknown, key: unknown, state: unknown): number {
    const room = this.room(roomId);
    const who = this.authorize(room, participantId, key);
    if (who.role !== "host") throw new CallRoomError(403, "hostOnly", "Only the host runs the jury.");
    if (JSON.stringify(state ?? null).length > MAX_STATE_CHARS) {
      throw new CallRoomError(413, "tooLarge", "That state is too large.");
    }
    room.state = state ?? null;
    room.stateVersion += 1;
    return room.stateVersion;
  }

  signal(roomId: string, participantId: unknown, key: unknown, to: unknown, type: unknown, payload: unknown): void {
    const room = this.room(roomId);
    const who = this.authorize(room, participantId, key);
    if (typeof type !== "string" || !(SIGNAL_TYPES as readonly string[]).includes(type)) {
      throw new CallRoomError(400, "badType", "Unknown signal.");
    }
    if (typeof to !== "string" || !room.participants.has(to) || to === who.id) {
      throw new CallRoomError(404, "noPeer", "That participant is not in this call.");
    }
    if (JSON.stringify(payload ?? null).length > MAX_PAYLOAD_CHARS) {
      throw new CallRoomError(413, "tooLarge", "That message is too large.");
    }
    // A spoken answer becomes a turn, and only the host files turns.
    if (type === "say" && room.participants.get(to)?.role !== "host") {
      throw new CallRoomError(400, "badType", "Answers go to the host.");
    }
    const box = room.mailbox.get(to)!;
    room.seq += 1;
    box.push({ seq: room.seq, from: who.id, type: type as SignalType, payload: payload ?? null });
    if (box.length > MAILBOX_CAP) box.splice(0, box.length - MAILBOX_CAP);
  }

  /**
   * Everything a participant has not seen yet: messages after `since`, and the
   * host's state when its version moved past `stateVersion`.
   */
  poll(
    roomId: string,
    participantId: unknown,
    key: unknown,
    since: unknown,
    stateVersion: unknown,
  ): {
    you: PublicParticipant;
    participants: PublicParticipant[];
    messages: CallMessage[];
    state: unknown;
    stateVersion: number;
    cursor: number;
    ended: boolean;
  } {
    const room = this.room(roomId);
    const who = this.authorize(room, participantId, key);
    who.lastSeen = this.now();
    this.dropOffline(room);
    const after = typeof since === "number" ? since : 0;
    const box = room.mailbox.get(who.id) ?? [];
    // Delivered is dropped: the cursor only moves forward.
    const messages = box.filter((message) => message.seq > after);
    room.mailbox.set(who.id, messages);
    const known = typeof stateVersion === "number" ? stateVersion : -1;
    return {
      you: publicOf(who),
      participants: [...room.participants.values()].map(publicOf),
      messages,
      state: room.stateVersion > known ? room.state : undefined,
      stateVersion: room.stateVersion,
      cursor: messages.at(-1)?.seq ?? after,
      ended: room.ended,
    };
  }

  leave(roomId: string, participantId: unknown, key: unknown): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const who = this.authorize(room, participantId, key);
    if (who.role === "host") {
      // Not deleted: the members are still on the end screen, waiting for
      // the jury's report of the defence they were part of.
      room.ended = true;
      return;
    }
    room.participants.delete(who.id);
    room.mailbox.delete(who.id);
  }

  /**
   * Whose report a participant may read: the host's account and the session
   * the call carried. Any participant, host or member, with their key.
   */
  reportOf(roomId: string, participantId: unknown, key: unknown): { hostAccount: string; sessionId: string | null } {
    const room = this.room(roomId);
    const who = this.authorize(room, participantId, key);
    who.lastSeen = this.now();
    return { hostAccount: room.hostAccount, sessionId: room.sessionId };
  }

  /** Rooms past their lifetime. Called on create, so the map cannot only grow. */
  sweep(): void {
    const cutoff = this.now() - ROOM_TTL_MS;
    for (const [id, room] of this.rooms) if (room.createdAt < cutoff) this.rooms.delete(id);
  }

  private room(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room || room.createdAt < this.now() - ROOM_TTL_MS) {
      throw new CallRoomError(404, "roomGone", "This call has ended or the link is wrong.");
    }
    return room;
  }

  private guests(room: Room): Participant[] {
    this.dropOffline(room);
    return [...room.participants.values()].filter((entry) => entry.role === "guest");
  }

  /** A guest whose tab closed frees the seat; the host never times out. */
  private dropOffline(room: Room): void {
    // After the call, members wait on the report and stop polling the call.
    if (room.ended) return;
    const cutoff = this.now() - OFFLINE_AFTER_MS;
    for (const [id, entry] of room.participants) {
      if (entry.role === "guest" && entry.lastSeen < cutoff) {
        room.participants.delete(id);
        room.mailbox.delete(id);
      }
    }
  }

  private authorize(room: Room, participantId: unknown, key: unknown): Participant {
    const who = typeof participantId === "string" ? room.participants.get(participantId) : undefined;
    if (!who || typeof key !== "string" || !sameSecret(who.key, key)) {
      throw new CallRoomError(403, "notInCall", "You are not in this call.");
    }
    return who;
  }
}

function publicOf(entry: Participant): PublicParticipant {
  return { id: entry.id, name: entry.name, role: entry.role };
}

/**
 * Where the cameras find a way to each other. STUN is enough on most home and
 * campus networks; a TURN relay, when configured, covers the ones where it is
 * not (strict university firewalls, some mobile carriers).
 */
export function iceServers(): { urls: string | string[]; username?: string; credential?: string }[] {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.CALL_TURN_URL?.trim();
  if (turn) {
    servers.push({
      urls: turn.split(",").map((entry) => entry.trim()).filter(Boolean),
      ...(process.env.CALL_TURN_USERNAME ? { username: process.env.CALL_TURN_USERNAME } : {}),
      ...(process.env.CALL_TURN_CREDENTIAL ? { credential: process.env.CALL_TURN_CREDENTIAL } : {}),
    });
  }
  return servers;
}
