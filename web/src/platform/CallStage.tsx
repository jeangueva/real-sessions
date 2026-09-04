import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";
import { Waveform } from "@/design-system";

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
  /** "Connecting", "Turn 3 of 7" — whatever the header would have said. */
  status: string;
}) {
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
          aria-label="The screen you are sharing"
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      )}

      <div
        className={
          sharing
            ? "absolute left-4 top-14 flex items-center gap-3 rounded-2xl border border-line bg-black/70 p-3 backdrop-blur"
            : "flex flex-col items-center gap-4 text-center"
        }
      >
        <span
          aria-hidden
          className={`grid place-items-center rounded-full font-medium tracking-wide transition-colors duration-500 ${
            sharing
              ? "h-10 w-10 text-sm"
              : "h-24 w-24 text-2xl sm:h-32 sm:w-32 sm:text-3xl"
          } ${speaking ? "bg-cream text-surface-base" : "bg-cream/10 text-cream-bright"}`}
        >
          {initials}
        </span>
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
          label={speaking ? `${name} is speaking` : `${name} is not speaking`}
          className="text-cream-bright"
        />
      </div>

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
              aria-label="Your camera, visible only to you"
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
