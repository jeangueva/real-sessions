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
  turnText,
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
   */
  caption?: string;
  /** Whether the microphone is open, which is what makes the caption line appear. */
  listening?: boolean;
  /** "Connecting", "Turn 3 of 7" — whatever the header would have said. */
  status: string;
  /** The current interviewer question to display inside the stage on mobile. */
  turnText?: string;
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
    /* FaceTime's stage: a dark room in both themes. The interviewer is the
       thing being watched, and a call on white reads as a form with a face on
       it. `on-media` pins the light ink and the dark accent, so everything
       inside — presence, waveform, captions — reads on black. */
    /* Half the screen at least on a phone — the column it sits in has no
       fixed height there, so `flex-1` alone left a 185px strip with the room
       empty below it. On desktop the row's fixed height decides instead. */
    <div className="on-media relative flex min-h-[50svh] flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] bg-surface-base p-4 shadow-float sm:p-6 lg:min-h-0">
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
            ? "absolute left-4 top-14 flex items-center gap-3 rounded-2xl bg-black/70 p-3 ring-1 ring-white/10 backdrop-blur-xl"
            : "flex flex-col items-center gap-2.5 sm:gap-4 text-center"
        }
      >
        {/* Small and flat while sharing a screen — the presence is for the
            moment the interviewer is the thing being looked at, and over
            somebody's slides it would be noise competing with their work. */}
        {sharing ? (
          <span
            aria-hidden
            className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold transition-colors duration-300 ${
              speaking ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent-text"
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
            className="scale-90 sm:scale-110"
          />
        )}
        <div className={sharing ? "text-left" : ""}>
          <p className={sharing ? "text-sm font-semibold text-cream-bright" : "text-lg font-semibold text-cream-bright sm:text-xl"}>
            {name}
          </p>
          <p className="text-xs text-cream-dim sm:text-sm">{title}</p>
        </div>
        <Waveform
          active={speaking}
          level={voiceLevel}
          measured={voiceMeasured}
          label={speaking ? t("call.speaking", { name }) : t("call.notSpeaking", { name })}
          // The interviewer's voice wears the accent, yours wears `grow`: two
          // colours, so it is clear at a glance whose turn it is.
          className="text-accent"
        />
      </div>

      {/* Subtitles on mobile inside the stage container */}
      {turnText && (
        <div className="absolute inset-x-3 bottom-3 z-10 max-h-24 overflow-y-auto rounded-2xl bg-black/60 p-3 ring-1 ring-white/10 backdrop-blur-xl sm:hidden">
          <p className="text-xs leading-relaxed text-cream-bright" aria-live="polite">
            {turnText}
          </p>
        </div>
      )}

      {listening && (
        /* Reserved height, so the stage does not jump the moment the first
           word lands. `aria-live` is deliberately absent: a screen reader
           announcing every revision of an interim transcript would talk over
           the person it belongs to. */
        <p className="pointer-events-none absolute inset-x-6 bottom-6 hidden min-h-[1.5rem] text-center text-sm text-cream-dim sm:block">
          {caption}
        </p>
      )}

      <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-cream-bright backdrop-blur-xl">
        {status}
      </span>

      {/* The self-view. Kept small and in the corner: it is a mirror to
          glance at, not the thing being watched. */}
      {(cameraStream || cameraError) && (
        <div className="absolute bottom-4 right-4 w-32 overflow-hidden rounded-2xl bg-black/40 shadow-float ring-1 ring-white/15 sm:w-44">
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
