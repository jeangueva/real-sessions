import { useCallback, useEffect, useRef } from "react";
import { recordingMimeType, saveRecording, type RecordingMark } from "@/lib/recordings";
import { sharedContext } from "@/lib/audio-level";

/** Who else is in a group defence's call, for the film. */
export interface RecordedCall {
  selfName: string;
  people: { id: string; name: string; stream: MediaStream | null }[];
  /** Sound with no face: the jury's voice, on the host. */
  extraAudio: MediaStreamTrack[];
}

/**
 * Films a rehearsal: the camera's picture and the student's microphone.
 *
 * Starts when asked for and the camera is on, and marks every juror's
 * question as it arrives, so the replay can jump to each answer. The jury's
 * voices are not in it — they come out of the speakers, not the microphone
 * track — and the questions are shown as text beside the video instead.
 *
 * Saved to this browser on `finish(sessionId)`. A rehearsal abandoned
 * half-way is dropped: there is no report to watch it against.
 */
export function useRehearsalRecorder(
  enabled: boolean,
  camera: MediaStream | null,
  /**
   * A group defence: the film is the whole call, not one camera. Decided when
   * filming starts, because a recording cannot change its tracks halfway —
   * so the picture is drawn on a canvas the classmates can join, and the
   * sound mixed into one track they can be added to.
   */
  group: RecordedCall | null = null,
) {
  const recorder = useRef<MediaRecorder | null>(null);
  const groupRef = useRef(group);
  groupRef.current = group;
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const composing = useRef<(() => void) | null>(null);
  const chunks = useRef<Blob[]>([]);
  const marks = useRef<RecordingMark[]>([]);
  const startedAt = useRef(0);
  const mic = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled || !camera || recorder.current) return;
    const mimeType = recordingMimeType();
    if (!mimeType) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .catch(() => null)
      .then((audio) => {
        if (cancelled) {
          audio?.getTracks().forEach((track) => track.stop());
          return;
        }
        mic.current = audio;
        const composite = groupRef.current ? composeCall(groupRef, cameraRef, audio) : null;
        composing.current = composite?.stop ?? null;
        const tracks = composite
          ? composite.tracks
          : [...camera.getVideoTracks(), ...(audio?.getAudioTracks() ?? [])];
        try {
          // A modest bitrate: this is to watch yourself, not to publish, and
          // a twenty-minute defence at the default would be gigabytes.
          const next = new MediaRecorder(new MediaStream(tracks), { mimeType, videoBitsPerSecond: 900_000 });
          next.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.current.push(event.data);
          };
          next.start(2_000);
          startedAt.current = performance.now();
          recorder.current = next;
        } catch {
          composing.current?.();
          audio?.getTracks().forEach((track) => track.stop());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, camera]);

  // Leaving the screen stops the camera tracks under the recorder; release
  // the microphone this hook opened as well.
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      composing.current?.();
      mic.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  /** A juror's question has started, or null for the exposition. */
  const mark = useCallback((question: string | null) => {
    if (!recorder.current) return;
    marks.current.push({ at: Math.max(0, performance.now() - startedAt.current), question });
  }, []);

  const finish = useCallback(async (sessionId: string): Promise<boolean> => {
    const active = recorder.current;
    if (!active) return false;
    recorder.current = null;
    await new Promise<void>((resolve) => {
      active.onstop = () => resolve();
      if (active.state === "inactive") resolve();
      else active.stop();
    });
    composing.current?.();
    composing.current = null;
    mic.current?.getTracks().forEach((track) => track.stop());
    if (chunks.current.length === 0) return false;
    const blob = new Blob(chunks.current, { type: active.mimeType });
    chunks.current = [];
    await saveRecording({
      sessionId,
      blob,
      mimeType: active.mimeType,
      marks: marks.current,
      createdAt: new Date().toISOString(),
    }).catch(() => undefined);
    return true;
  }, []);

  return { mark, finish, active: () => recorder.current !== null };
}

const FRAME_MS = 1000 / 15;
const WIDTH = 1280;
const HEIGHT = 720;

/**
 * The whole call as one picture and one sound.
 *
 * Every camera is drawn into a grid on a canvas fifteen times a second, the
 * way the call itself lays them out, with each name in the corner; someone
 * whose camera is off is their initials. The sound is every voice — yours,
 * the classmates', and on the host the jury's — mixed into one track. Both
 * read the current call through refs, so a classmate who joins after the
 * film started appears in it.
 */
function composeCall(
  group: { current: RecordedCall | null },
  camera: { current: MediaStream | null },
  mic: MediaStream | null,
): { tracks: MediaStreamTrack[]; stop: () => void } | null {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const paint = canvas.getContext("2d");
  const context = sharedContext();
  if (!paint || typeof canvas.captureStream !== "function") return null;

  const videos = new Map<string, HTMLVideoElement>();
  const element = (key: string, stream: MediaStream | null): HTMLVideoElement | null => {
    if (!stream || stream.getVideoTracks().length === 0) return null;
    let video = videos.get(key);
    if (!video) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      videos.set(key, video);
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }
    return video;
  };

  const destination = context?.createMediaStreamDestination() ?? null;
  const sources = new Map<string, MediaStreamAudioSourceNode>();
  const listen = (tracks: MediaStreamTrack[]) => {
    if (!context || !destination) return;
    const wanted = new Set(tracks.map((track) => track.id));
    for (const [id, source] of sources) {
      if (!wanted.has(id)) {
        source.disconnect();
        sources.delete(id);
      }
    }
    for (const track of tracks) {
      if (sources.has(track.id) || track.readyState !== "live") continue;
      try {
        const source = context.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
        sources.set(track.id, source);
      } catch {
        // A track that cannot be read is left out, not the whole film.
      }
    }
  };

  const draw = () => {
    const call = group.current;
    const tiles = [
      { key: "self", name: call?.selfName ?? "", stream: camera.current },
      ...(call?.people ?? []).map((person) => ({ key: person.id, name: person.name, stream: person.stream })),
    ];
    listen([
      ...(mic?.getAudioTracks() ?? []),
      ...(call?.people ?? []).flatMap((person) => person.stream?.getAudioTracks() ?? []),
      ...(call?.extraAudio ?? []),
    ]);

    paint.fillStyle = "#0b0b0f";
    paint.fillRect(0, 0, WIDTH, HEIGHT);
    const columns = tiles.length <= 1 ? 1 : tiles.length <= 4 ? 2 : 3;
    const rows = Math.ceil(tiles.length / columns);
    const gap = 12;
    const width = (WIDTH - gap * (columns + 1)) / columns;
    const height = (HEIGHT - gap * (rows + 1)) / rows;
    tiles.forEach((tile, index) => {
      const x = gap + (index % columns) * (width + gap);
      const y = gap + Math.floor(index / columns) * (height + gap);
      const video = element(tile.key, tile.stream);
      paint.fillStyle = "#1c1c24";
      paint.fillRect(x, y, width, height);
      if (video && video.videoWidth > 0) {
        // Cover, like the tiles on screen: crop rather than letterbox.
        const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
        const w = video.videoWidth * scale;
        const h = video.videoHeight * scale;
        paint.save();
        paint.beginPath();
        paint.rect(x, y, width, height);
        paint.clip();
        if (tile.key === "self") {
          // Mirrored, as you saw yourself.
          paint.translate(x + width / 2, 0);
          paint.scale(-1, 1);
          paint.drawImage(video, -w / 2, y + (height - h) / 2, w, h);
        } else {
          paint.drawImage(video, x + (width - w) / 2, y + (height - h) / 2, w, h);
        }
        paint.restore();
      } else {
        const initials = tile.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();
        paint.fillStyle = "#e8e6f0";
        paint.font = `600 ${Math.round(height / 5)}px system-ui, sans-serif`;
        paint.textAlign = "center";
        paint.textBaseline = "middle";
        paint.fillText(initials || "…", x + width / 2, y + height / 2);
      }
      if (tile.name) {
        paint.font = "600 22px system-ui, sans-serif";
        paint.textAlign = "left";
        paint.textBaseline = "alphabetic";
        const label = tile.name;
        const labelWidth = paint.measureText(label).width + 24;
        paint.fillStyle = "rgba(0,0,0,0.6)";
        paint.fillRect(x + 12, y + height - 48, labelWidth, 36);
        paint.fillStyle = "#ffffff";
        paint.fillText(label, x + 24, y + height - 22);
      }
    });
  };

  draw();
  const timer = window.setInterval(draw, FRAME_MS);
  const picture = canvas.captureStream(15).getVideoTracks();
  const sound = destination?.stream.getAudioTracks() ?? mic?.getAudioTracks() ?? [];
  return {
    tracks: [...picture, ...sound],
    stop: () => {
      window.clearInterval(timer);
      for (const source of sources.values()) source.disconnect();
      sources.clear();
      for (const video of videos.values()) video.srcObject = null;
      videos.clear();
      picture.forEach((track) => track.stop());
    },
  };
}
