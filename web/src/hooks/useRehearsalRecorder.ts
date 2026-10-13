import { useCallback, useEffect, useRef } from "react";
import { recordingMimeType, saveRecording, type RecordingMark } from "@/lib/recordings";

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
export function useRehearsalRecorder(enabled: boolean, camera: MediaStream | null) {
  const recorder = useRef<MediaRecorder | null>(null);
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
        const tracks = [...camera.getVideoTracks(), ...(audio?.getAudioTracks() ?? [])];
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
