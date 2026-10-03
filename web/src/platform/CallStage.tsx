import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";
import { InterviewerPresence, Waveform } from "@/design-system";
import { useT } from "@/hooks/useLocale";

/**
 * The two tiles: whoever is talking, and you in the corner.
 *
 * The interviewer has no face, and inventing one would be a lie about what
 * this is. What the tile shows instead is the two things that are true —
 * their name and job, and whether they are speaking right now — with the
 * waveform reading the actual audio rather than a canned animation.
 *
 * The self-view is a mirror: `scale-x-[-1]`, because an unmirrored preview of
 * your own face is uncanny and every video call flips it for that reason.
 */

export function CallStage({
  initials,
  name,
  title,
  speaking,
  voiceLevel,
  voiceMeasured,
  cameraStream,
  cameraError,
  screenStream,
  status,
  caption,
  listening,
}: {
  initials: string;
  name: string;
  title: string;
  speaking: boolean;
  voiceLevel: () => number;
  voiceMeasured: () => boolean;
  cameraStream: MediaStream | null;
  cameraError: string | null;
  /** When sharing, this takes the stage and the interviewer steps aside. */
  screenStream: MediaStream | null;
  /**
   * What the candidate is saying, as it is being said.
   *
   * Drawn here rather than only in the transcript panel, which fills in whole
   * turns after they close. Someone speaking looks at the person they are
   * speaking to, so the words have to appear under the face — the same place
   * a video call puts its captions, for the same reason.
   */
  caption?: string;
  /** Whether the microphone is open, which is what makes the caption line appear. */
  listening?: boolean;
  /** "Connecting", "Turn 3 of 7" — whatever the header would have said. */
  status: string;
}) {
  const t = useT();
  const self = useRef<HTMLVideoElement>(null);
  const shared = useRef<HTMLVideoElement>(null);

  // `srcObject` is a property, not an attribute: React cannot set it from JSX,
  // so it is assigned here whenever the stream changes.
  useEffect(() => {
    const video = self.current;
    if (!video) return;
    video.srcObject = cameraStream;
    if (cameraStream) void video.play().catch(() => undefined);
  }, [cameraStream]);

  useEffect(() => {
    const video = shared.current;
    if (!video) return;
    video.srcObject = screenStream;
    if (screenStream) void video.play().catch(() => undefined);
  }, [screenStream]);

  const sharing = screenStream !== null;

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-sunken p-6">
      {/* Sharing rearranges the room rather than adding to it, the way a
          call does: what you are presenting is the thing worth the space, and
          the interviewer shrinks to a strip that still shows them talking. */}
      {sharing && (
        <video
          ref={shared}
          muted
          playsInline
          aria-label={t("call.sharedScreen")}
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      )}

      <div
        className={
          sharing
            // A surface, not literal black: the label on it is the ink
            // colour, and on a light theme near-black text on a black plate
            // is invisible. It sits over arbitrary shared content, so it
            // stays mostly opaque.
            ? "absolute left-4 top-14 flex items-center gap-3 rounded-2xl border border-line bg-surface-deep/90 p-3 backdrop-blur"
            : "flex flex-col items-center gap-4 text-center"
        }
      >
        {/* Small and flat while sharing a screen — the presence is for the
            moment the interviewer is the thing being looked at, and over
            somebody's slides it would be noise competing with their work. */}
        {sharing ? (
          <span
            aria-hidden
            className={`grid h-10 w-10 place-items-center rounded-full text-sm font-medium tracking-wide transition-colors duration-500 ${
              speaking ? "bg-cream text-surface-base" : "bg-cream/10 text-cream-bright"
            }`}
          >
            {initials}
          </span>
        ) : (
          <InterviewerPresence
            initials={initials}
            speaking={speaking}
            // Measured only: an unmeasured meter reads zero for ever, and a
            // halo frozen flat while somebody talks is worse than none.
            level={voiceMeasured() ? voiceLevel : undefined}
            size={128}
            className="sm:scale-110"
          />
        )}
        <div className={sharing ? "text-left" : ""}>
          <p className={sharing ? "text-sm text-cream-bright" : "text-base text-cream-bright sm:text-lg"}>
            {name}
          </p>
          <p className="text-xs text-cream-dim sm:text-sm">{title}</p>
        </div>
        <Waveform
          active={speaking}
          level={voiceLevel}
          measured={voiceMeasured}
          label={speaking ? t("call.speaking", { name }) : t("call.notSpeaking", { name })}
          className="text-cream-bright"
        />
      </div>

      {listening && (
        /* Reserved height, so the stage does not jump the moment the first
           word lands. `aria-live` is deliberately absent: a screen reader
           announcing every revision of an interim transcript would talk over
           the person it belongs to. */
        <p className="pointer-events-none absolute inset-x-6 bottom-6 min-h-[1.5rem] text-center text-sm text-cream-dim">
          {caption}
        </p>
      )}

      <span className="absolute left-4 top-4 rounded-full border border-line px-3 py-1 text-xs text-cream-dim">
        {status}
      </span>

      {/* The self-view. Kept small and in the corner: it is a mirror to
          glance at, not the thing being watched. */}
      {(cameraStream || cameraError) && (
        <div className="absolute bottom-4 right-4 w-32 overflow-hidden rounded-2xl border border-line bg-surface-sunken sm:w-44">
          {cameraStream ? (
            <video
              ref={self}
              muted
              playsInline
              aria-label={t("call.selfView")}
              className="aspect-video w-full scale-x-[-1] object-cover"
            />
          ) : (
            <p className="flex items-center gap-2 p-3 text-xs text-cream-dim">
              <VideoOff className="h-4 w-4 shrink-0" aria-hidden />
              {cameraError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
