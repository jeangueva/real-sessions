import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CallRoomError, CallRooms, MAX_GUESTS, OFFLINE_AFTER_MS, ROOM_TTL_MS } from "../src/call-rooms.js";
import { post, startHarness, type Harness } from "./support/http.js";

describe("call rooms", () => {
  let clock = 1_000_000;
  const rooms = () => new CallRooms(() => clock);

  it("lets classmates join, up to the size of a group thesis", () => {
    const calls = rooms();
    const host = calls.create("acct", ["Ana", "Luis", "Rosa"], "Ana");
    expect(calls.preview(host.roomId)).toEqual({ hostName: "Ana", members: ["Ana", "Luis", "Rosa"], full: false });
    for (let index = 0; index < MAX_GUESTS; index += 1) calls.join(host.roomId, `Guest ${index}`);
    expect(() => calls.join(host.roomId, "One more")).toThrow(CallRoomError);
    expect(calls.preview(host.roomId).full).toBe(true);
  });

  it("delivers a signal once and only to its recipient", () => {
    const calls = rooms();
    const host = calls.create("acct", ["Ana", "Luis"], "Ana");
    const guest = calls.join(host.roomId, "Luis");
    calls.signal(host.roomId, guest.participantId, guest.key, host.participantId, "say", { text: "Mi parte es el método." });
    const first = calls.poll(host.roomId, host.participantId, host.key, 0, -1);
    expect(first.messages).toHaveLength(1);
    expect(first.messages[0]).toMatchObject({ from: guest.participantId, type: "say" });
    const again = calls.poll(host.roomId, host.participantId, host.key, first.cursor, first.stateVersion);
    expect(again.messages).toHaveLength(0);
    expect(calls.poll(host.roomId, guest.participantId, guest.key, 0, -1).messages).toHaveLength(0);
  });

  it("only takes the room's state from the host, and only sends it when it changed", () => {
    const calls = rooms();
    const host = calls.create("acct", ["Ana", "Luis"], "Ana");
    const guest = calls.join(host.roomId, "Luis");
    expect(() => calls.publish(host.roomId, guest.participantId, guest.key, { turn: "x" })).toThrow(/host/);
    const version = calls.publish(host.roomId, host.participantId, host.key, { turn: "Buenos días" });
    const seen = calls.poll(host.roomId, guest.participantId, guest.key, 0, -1);
    expect(seen.state).toEqual({ turn: "Buenos días" });
    expect(calls.poll(host.roomId, guest.participantId, guest.key, 0, version).state).toBeUndefined();
  });

  it("refuses a wrong key, an answer sent to a classmate, and a room past its lifetime", () => {
    const calls = rooms();
    const host = calls.create("acct", ["Ana", "Luis", "Rosa"], "Ana");
    const luis = calls.join(host.roomId, "Luis");
    const rosa = calls.join(host.roomId, "Rosa");
    expect(() => calls.poll(host.roomId, luis.participantId, host.key, 0, -1)).toThrow(/not in this call/);
    expect(() => calls.signal(host.roomId, luis.participantId, luis.key, rosa.participantId, "say", { text: "hola" })).toThrow();
    clock += ROOM_TTL_MS + 1;
    expect(() => calls.preview(host.roomId)).toThrow(/ended/);
  });

  it("keeps the room when the host leaves, so the members can read the report", () => {
    const calls = rooms();
    const host = calls.create("acct", ["Ana", "Luis"], "Ana", "session-1");
    const guest = calls.join(host.roomId, "Luis");
    calls.leave(host.roomId, host.participantId, host.key);
    expect(calls.poll(host.roomId, guest.participantId, guest.key, 0, -1).ended).toBe(true);
    expect(calls.reportOf(host.roomId, guest.participantId, guest.key)).toEqual({ hostAccount: "acct", sessionId: "session-1" });
    // Waiting on the report is not being offline.
    clock += OFFLINE_AFTER_MS * 5;
    expect(() => calls.reportOf(host.roomId, guest.participantId, guest.key)).not.toThrow();
    expect(() => calls.join(host.roomId, "Rosa")).toThrow(/ended/);
  });

  it("frees the seat of a classmate whose tab closed", () => {
    const calls = rooms();
    const host = calls.create("acct", ["Ana", "Luis", "Rosa"], "Ana");
    calls.join(host.roomId, "Luis");
    calls.join(host.roomId, "Rosa");
    clock += OFFLINE_AFTER_MS + 1;
    calls.poll(host.roomId, host.participantId, host.key, 0, -1);
    expect(calls.preview(host.roomId).full).toBe(false);
  });
});

describe("call routes", () => {
  let api: Harness;
  beforeEach(async () => {
    api = await startHarness();
  });
  afterEach(async () => {
    await api.stop();
  });

  it("tells a member the report is not ready while the session has none", async () => {
    await api.authenticate();
    const opened = await api.json<{ roomId: string; participantId: string; key: string }>(
      "/api/call",
      post({ members: ["Ana", "Luis"], name: "Ana", sessionId: "not-finished-yet" }),
    );
    api.forget();
    const joined = await api.json<{ participantId: string; key: string }>(`/api/call/${opened.roomId}/join`, post({ name: "Luis" }));
    const waiting = await api.call(`/api/call/${opened.roomId}/report`, post(joined));
    expect(waiting.status).toBe(202);
    expect((await api.call(`/api/call/${opened.roomId}/report`, post({ ...joined, key: "wrong" }))).status).toBe(403);
  });

  it("opens a room for a signed-in host and lets a classmate join without an account", async () => {
    expect((await api.call("/api/call", post({ members: ["Ana", "Luis"] }))).status).toBe(401);
    await api.authenticate();
    const opened = await api.json<{ roomId: string; participantId: string; key: string; iceServers: unknown[] }>(
      "/api/call",
      post({ members: ["Ana", "Luis"], name: "Ana" }),
    );
    expect(opened.iceServers.length).toBeGreaterThan(0);

    api.forget();
    const preview = await api.json<{ hostName: string }>(`/api/call/${opened.roomId}`);
    expect(preview.hostName).toBe("Ana");
    const joined = await api.json<{ participantId: string; key: string }>(
      `/api/call/${opened.roomId}/join`,
      post({ name: "Luis" }),
    );
    const said = await api.call(
      `/api/call/${opened.roomId}/signal`,
      post({ ...joined, to: opened.participantId, type: "say", payload: { text: "Respondo yo." } }),
    );
    expect(said.status).toBe(202);
    const polled = await api.json<{ messages: { type: string }[]; participants: unknown[] }>(
      `/api/call/${opened.roomId}/poll`,
      post({ participantId: opened.participantId, key: opened.key, since: 0 }),
    );
    expect(polled.messages.map((message) => message.type)).toEqual(["say"]);
    expect(polled.participants).toHaveLength(2);

    const stranger = await api.call(`/api/call/${opened.roomId}/poll`, post({ participantId: joined.participantId, key: "nope" }));
    expect(stranger.status).toBe(403);

    // No session behind this room: nothing to report.
    const report = await api.call(`/api/call/${opened.roomId}/report`, post(joined));
    expect(report.status).toBe(404);
  });
});
