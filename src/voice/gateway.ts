/**
 * The WebSocket the browser talks to for live transcription.
 *
 * One socket per open microphone. The browser sends binary audio frames and a
 * couple of JSON control messages; this relays the audio to Deepgram and
 * relays transcripts back. The provider key stays on this side, which is the
 * only reason the hop exists.
 *
 * Everything here is defensive about one thing in particular: a candidate is
 * mid-interview at the other end. A transcription failure closes this socket
 * with a reason the client can show, and the client falls back to typing. It
 * never throws into the HTTP server or takes the process down.
 */
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import { openDeepgram, deepgramConfigured, type DeepgramSocket } from "./deepgram.js";

/** Close codes the client reads to decide whether to fall back or retry. */
export const CLOSE = {
  /** No key configured. The client should use browser speech instead. */
  UNAVAILABLE: 4001,
  /** No identity cookie. */
  UNAUTHENTICATED: 4003,
  /** Too many open microphones for one identity. */
  BUSY: 4008,
  /** Upstream failed mid-stream. */
  UPSTREAM: 4011,
} as const;

/**
 * A single socket is one microphone, and a person has one mouth. More than a
 * couple per identity is a leak or an abuser, and each one costs upstream
 * minutes.
 */
const MAX_SOCKETS_PER_IDENTITY = 2;

/**
 * Silence timeout. An abandoned tab holds a Deepgram stream open and bills for
 * it, so a socket that sends no audio for this long is closed.
 */
const IDLE_MS = 60_000;

export interface GatewayDeps {
  /** Resolves the identity from the upgrade request, or null to reject. */
  identify(req: IncomingMessage): string | null;
}

export function attachVoiceGateway(server: Server, deps: GatewayDeps): WebSocketServer {
  // `noServer` so this shares the port with the HTTP API and can reject an
  // upgrade before allocating a socket for it.
  const wss = new WebSocketServer({ noServer: true });
  const openPerIdentity = new Map<string, number>();

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname !== "/api/voice") {
      // Not ours. Destroy rather than ignore: leaving it hanging keeps a
      // half-open connection until the client gives up.
      socket.destroy();
      return;
    }

    const identity = deps.identify(req);
    if (!identity) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      wss.emit("connection", client, req, identity);
    });
  });

  wss.on("connection", (client: WebSocket, _req: IncomingMessage, identity: string) => {
    if (!deepgramConfigured()) {
      // Closed immediately with a code the client understands, rather than
      // accepting audio and silently transcribing nothing.
      client.close(CLOSE.UNAVAILABLE, "Live transcription is not configured.");
      return;
    }

    const held = openPerIdentity.get(identity) ?? 0;
    if (held >= MAX_SOCKETS_PER_IDENTITY) {
      client.close(CLOSE.BUSY, "Too many open microphones.");
      return;
    }
    openPerIdentity.set(identity, held + 1);

    let upstream: DeepgramSocket | null = null;
    let idleTimer: NodeJS.Timeout | null = null;
    let closed = false;

    const shutdown = (code?: number, reason?: string) => {
      if (closed) return;
      closed = true;
      if (idleTimer) clearTimeout(idleTimer);
      upstream?.close();
      const remaining = (openPerIdentity.get(identity) ?? 1) - 1;
      if (remaining <= 0) openPerIdentity.delete(identity);
      else openPerIdentity.set(identity, remaining);
      if (client.readyState === WebSocket.OPEN) {
        if (code) client.close(code, reason);
        else client.close();
      }
    };

    const touch = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => shutdown(CLOSE.UPSTREAM, "Idle."), IDLE_MS);
    };

    const say = (payload: unknown) => {
      if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(payload));
    };

    try {
      upstream = openDeepgram({
        onTranscript: (transcript) => say({ type: "transcript", ...transcript }),
        onError: (message) => {
          console.error("[realsessions] deepgram:", message);
          say({ type: "error", message: "Live transcription dropped." });
          shutdown(CLOSE.UPSTREAM, "Upstream error.");
        },
        onClose: () => shutdown(),
      });
    } catch (error) {
      console.error("[realsessions] deepgram open failed:", error);
      shutdown(CLOSE.UPSTREAM, "Could not reach the transcription service.");
      return;
    }

    touch();
    say({ type: "ready" });

    client.on("message", (data: RawData, isBinary: boolean) => {
      touch();

      if (isBinary) {
        upstream?.send(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer));
        return;
      }

      // The only text the client sends is control. Anything unparsable is
      // ignored rather than forwarded, so a malformed frame cannot reach
      // Deepgram as audio.
      try {
        const message = JSON.parse(data.toString()) as { type?: string };
        if (message.type === "finish") upstream?.finish();
      } catch {
        /* ignored */
      }
    });

    client.on("close", () => shutdown());
    client.on("error", () => shutdown());
  });

  return wss;
}
