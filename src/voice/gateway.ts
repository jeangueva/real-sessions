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
import process from "node:process";
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

/**
 * Whether a browser on `origin` may open this socket.
 *
 * The upgrade authenticates with the same cookie as every other request, and
 * the same-origin policy does not apply to WebSockets — a page on any domain
 * can open one. `SameSite=Lax` does stop the cookie riding along in current
 * browsers, so this is not an open door, but it is the entire defence and it
 * lives in one cookie attribute. Checking the origin is three lines and does
 * not depend on that.
 *
 * A missing Origin header is allowed: browsers always send one on a WebSocket
 * handshake, so its absence means a non-browser client, which cannot be the
 * confused deputy this is guarding against.
 */
export function originAllowed(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;

  const allowed = new Set<string>();
  const site = process.env.REALSESSIONS_SITE_URL;
  if (site) {
    try {
      allowed.add(new URL(site).origin);
    } catch {
      /* a malformed value simply contributes nothing */
    }
  }
  // The host the request arrived on, so a deployment behind its own domain
  // works without also being named in the environment.
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  // The dev server, which proxies /api to this port from a different one.
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:5173");
    allowed.add("http://127.0.0.1:5173");
  }

  return allowed.has(origin);
}

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

    if (!originAllowed(req.headers.origin, req.headers.host)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
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

  wss.on("connection", (client: WebSocket, req: IncomingMessage, identity: string) => {
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
        // The socket carries the language the session is running in. Without
        // it a Spanish interview is transcribed by an English-only model,
        // which returns confident nonsense rather than an error.
        language:
          new URL(
            req.url ?? "/",
            `http://${req.headers.host ?? "localhost"}`,
          ).searchParams.get("language") ?? undefined,
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
