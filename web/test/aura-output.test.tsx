import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuraOutput, createSpeechOutput } from "../src/lib/voice";

/**
 * The speaking half of the interview.
 *
 * Named `.tsx` so it runs under happy-dom: `createSpeechOutput` reads
 * `window.speechSynthesis`, and the root suite runs `web/test/*.test.ts` in
 * node, where there is no window. That naming split is the repo's existing
 * convention for "this one needs a DOM".
 *
 * Two behaviours are worth pinning. The interviewer must never come out as a
 * novelty voice — macOS ships two dozen of them and they sort ahead of the
 * real ones. And when the provider is unavailable the interview must keep
 * talking, because a silent interviewer looks like a broken product rather
 * than a degraded one.
 */

interface FakeVoice {
  name: string;
  lang: string;
  localService: boolean;
}

const spoken: { text: string; voice: string | null }[] = [];
let installed: FakeVoice[] = [];

class FakeUtterance {
  voice: FakeVoice | null = null;
  lang = "";
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor(readonly text: string) {}
}

beforeEach(() => {
  spoken.length = 0;
  installed = [];
  vi.stubGlobal("speechSynthesis", {
    speaking: false,
    getVoices: () => installed,
    cancel: () => undefined,
    speak: (utterance: FakeUtterance) => {
      spoken.push({ text: utterance.text, voice: utterance.voice?.name ?? null });
      utterance.onend?.();
    },
  });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the browser fallback voice", () => {
  it("never picks a novelty voice, even when it sorts first", () => {
    // "Albert" is a croaky joke voice that comes before "Samantha"
    // alphabetically, and it was what the last-resort pick returned.
    installed = [
      { name: "Albert", lang: "en-US", localService: true },
      { name: "Zarvox", lang: "en-US", localService: true },
      { name: "Samantha", lang: "en-US", localService: true },
    ];
    const output = createSpeechOutput("en-US", { rate: 1, pitch: 1, prefer: [] });
    void output.speak("Tell me about a tradeoff.");
    expect(spoken[0]!.voice).toBe("Samantha");
  });

  it("recognises the localised names macOS reports", () => {
    // Chrome reports these translated on a Spanish system, so an
    // English-only blocklist lets them straight through.
    installed = [
      { name: "Bufón", lang: "en-US", localService: true },
      { name: "Daniel", lang: "en-GB", localService: true },
    ];
    const output = createSpeechOutput("en-US", { rate: 1, pitch: 1, prefer: [] });
    void output.speak("Hello.");
    expect(spoken[0]!.voice).toBe("Daniel");
  });

  it("honours the persona's preference when it is installed", () => {
    installed = [
      { name: "Samantha", lang: "en-US", localService: true },
      { name: "Daniel", lang: "en-GB", localService: true },
    ];
    const output = createSpeechOutput("en-US", {
      rate: 1,
      pitch: 1,
      prefer: ["Daniel"],
    });
    void output.speak("Hello.");
    expect(spoken[0]!.voice).toBe("Daniel");
  });

  it("still speaks when every installed voice is a novelty one", () => {
    // A worse voice beats no voice.
    installed = [{ name: "Zarvox", lang: "en-US", localService: true }];
    const output = createSpeechOutput("en-US", { rate: 1, pitch: 1, prefer: [] });
    void output.speak("Hello.");
    expect(spoken).toHaveLength(1);
  });
});

describe("the Aura voice", () => {
  const audio = () => new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" });

  /** Stands in for the <audio> element, which happy-dom cannot decode. */
  function stubAudio(outcome: "ended" | "error" = "ended") {
    const played: string[] = [];
    class FakeAudio {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly src: string) {}
      play() {
        played.push(this.src);
        queueMicrotask(() =>
          outcome === "ended" ? this.onended?.() : this.onerror?.(),
        );
        return Promise.resolve();
      }
      pause() {}
    }
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:fake",
      revokeObjectURL: () => undefined,
    });
    return played;
  }

  it("asks the server for the persona's voice and plays what comes back", async () => {
    const played = stubAudio();
    const fetchMock = vi.fn(async () => new Response(audio(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const output = createAuraOutput("skeptic");
    expect(await output.speak("Tell me about a tradeoff.")).toBe("ok");

    expect(played).toEqual(["blob:fake"]);
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    // The persona travels, never a model — the server owns that mapping.
    expect(body).toEqual({ text: "Tell me about a tradeoff.", personaId: "skeptic" });
  });

  it("falls back to the browser when the server refuses", async () => {
    installed = [{ name: "Samantha", lang: "en-US", localService: true }];
    stubAudio();
    vi.stubGlobal("fetch", async () => new Response("", { status: 502 }));

    const output = createAuraOutput("skeptic", { rate: 1, pitch: 1, prefer: [] });
    expect(await output.speak("Hello.")).toBe("ok");
    expect(spoken[0]!.text).toBe("Hello.");
  });

  it("stops asking after the first failure", async () => {
    installed = [{ name: "Samantha", lang: "en-US", localService: true }];
    stubAudio();
    const fetchMock = vi.fn(async () => new Response("", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const output = createAuraOutput("warm", { rate: 1, pitch: 1, prefer: [] });
    await output.speak("One.");
    await output.speak("Two.");
    await output.speak("Three.");

    // Retrying a down provider once per sentence turns the interview into a
    // series of two-second silences.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(spoken.map((entry) => entry.text)).toEqual(["One.", "Two.", "Three."]);
  });

  it("reuses a primed phrase instead of fetching it twice", async () => {
    stubAudio();
    const fetchMock = vi.fn(async () => new Response(audio(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const output = createAuraOutput("rapid");
    output.prime?.("Second sentence.");
    await output.speak("Second sentence.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an autoplay block rather than degrading", async () => {
    // The browser's own policy — the fallback would hit exactly the same wall.
    class BlockedAudio {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      play() {
        return Promise.reject(new Error("not allowed"));
      }
      pause() {}
    }
    vi.stubGlobal("Audio", BlockedAudio);
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:fake",
      revokeObjectURL: () => undefined,
    });
    const fetchMock = vi.fn(async () => new Response(audio(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const output = createAuraOutput("measured");
    expect(await output.speak("Hello.")).toBe("blocked");
    expect(spoken).toHaveLength(0);
  });
});
