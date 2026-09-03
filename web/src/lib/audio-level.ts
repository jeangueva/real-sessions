/**
 * Loudness, measured rather than mimed.
 *
 * The waveform beside a speaker is a claim: that something is being heard
 * right now, and this is how loud. A bar chart running off a timer makes the
 * same claim and is lying — it keeps dancing through a silence, which is
 * exactly the moment a candidate needs to know the microphone stopped hearing
 * them. So both ends are metered off the real signal: the interviewer from the
 * audio element playing Aura's MP3, the candidate from the microphone track
 * already open for transcription.
 *
 * `measured: false` is the honest escape hatch. The browser's own speech
 * synthesiser exposes no audio node, so nothing can be measured there and the
 * caller is told so rather than handed a plausible number.
 */

export interface LevelMeter {
  /**
   * False when this meter cannot see the signal. The caller should animate
   * something generic instead of pretending the number means anything.
   */
  readonly measured: boolean;
  /** Loudness right now, 0–1. Root-mean-square, not peak. */
  level(): number;
  stop(): void;
}

export const UNMEASURED: LevelMeter = {
  measured: false,
  level: () => 0,
  stop: () => undefined,
};

type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

let shared: AudioContext | null = null;

/**
 * One context for the whole page.
 *
 * Browsers cap how many can exist at once — Chrome refuses past about six —
 * and an interview creates an audio element per sentence. A context per
 * element would run out partway through the third turn.
 */
export function sharedContext(): AudioContext | null {
  if (shared) return shared;
  const Constructor = audioContextConstructor();
  if (!Constructor) return null;
  try {
    shared = new Constructor();
  } catch {
    return null;
  }
  return shared;
}

/** Resets the singleton. Tests only — a page has exactly one context. */
export function resetSharedContext(): void {
  shared = null;
}

/** RMS of one analyser frame, gently scaled so speech fills the meter. */
export function readLevel(
  analyser: AnalyserNode,
  buffer: Uint8Array<ArrayBuffer>,
): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    // The frame is centred on 128; the deviation from it is the signal.
    const deviation = (buffer[i]! - 128) / 128;
    sum += deviation * deviation;
  }
  const rms = Math.sqrt(sum / buffer.length);
  // Conversational speech sits around 0.05–0.15 RMS. Left raw the bars barely
  // move, so the usable band is stretched over the full range.
  return Math.min(1, rms * 4);
}

/** Shared analyser setup: small FFT, light smoothing, a reusable frame buffer. */
function analyse(context: AudioContext): {
  analyser: AnalyserNode;
  buffer: Uint8Array<ArrayBuffer>;
} {
  const analyser = context.createAnalyser();
  // 512 samples is about 11ms at 48kHz — fine enough to track syllables,
  // coarse enough that reading it every frame costs nothing.
  analyser.fftSize = 512;
  // Some smoothing, or the bars strobe on every consonant.
  analyser.smoothingTimeConstant = 0.6;
  return { analyser, buffer: new Uint8Array(new ArrayBuffer(analyser.fftSize)) };
}

/**
 * Meters a microphone stream.
 *
 * Nothing is connected to the destination: routing the microphone to the
 * speakers is how you get feedback howl.
 */
export function meterFromStream(stream: MediaStream): LevelMeter {
  const context = sharedContext();
  if (!context) return UNMEASURED;

  let source: MediaStreamAudioSourceNode;
  try {
    source = context.createMediaStreamSource(stream);
  } catch {
    return UNMEASURED;
  }

  const { analyser, buffer } = analyse(context);
  source.connect(analyser);

  return {
    measured: true,
    level: () => readLevel(analyser, buffer),
    stop: () => {
      source.disconnect();
      analyser.disconnect();
    },
  };
}

/** Elements that can hand out a copy of what they are playing. */
interface CapturableAudio extends HTMLAudioElement {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
}

/**
 * Meters an audio element by tapping it, never by rerouting it.
 *
 * The obvious route is `createMediaElementSource`, and it is a trap: it moves
 * the element's output *into* the graph, so playback then depends on the
 * analyser being connected onward to `destination` and on the context being
 * running. Get either wrong and the interviewer goes silent — which is exactly
 * what happened the first time this shipped: the element stalled, `onended`
 * never fired, and the speech queue wedged behind a phrase that was never
 * going to finish.
 *
 * `captureStream` hands out a copy instead. The element keeps playing through
 * the normal path whatever this does, so the worst case here is a still
 * waveform rather than a mute interview. Safari does not implement it, and
 * gets `UNMEASURED`.
 *
 * Call this once the element is playing. Before that the captured stream
 * carries no audio track and `createMediaStreamSource` throws, which is caught
 * below and reads as "cannot measure" — indistinguishable, from the outside,
 * from a browser that does not support this at all.
 */
export function meterFromElement(element: HTMLAudioElement): LevelMeter {
  const context = sharedContext();
  if (!context) return UNMEASURED;

  const capturable = element as CapturableAudio;
  const capture = capturable.captureStream ?? capturable.mozCaptureStream;
  if (!capture) return UNMEASURED;

  let stream: MediaStream;
  try {
    stream = capture.call(capturable);
  } catch {
    return UNMEASURED;
  }

  return meterFromStream(stream);
}

/**
 * Asks the context to start, which browsers only allow from a user gesture.
 *
 * Called from the same click that turns voice on. Failing is fine and silent:
 * everything downstream falls back to an unmeasured meter.
 */
export function resumeAudio(): void {
  const context = sharedContext();
  if (context && context.state === "suspended") void context.resume().catch(() => undefined);
}
