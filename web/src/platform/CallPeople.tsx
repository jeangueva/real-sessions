import { useEffect, useRef, useState } from "react";
import { MicOff, VideoOff } from "lucide-react";
import { InterviewerPresence, Waveform } from "@/design-system";
import type { JurorTag } from "@/lib/voice";

/**
 * Who is in the room of a thesis defence: the three jurors across the top,
 * the people defending along the bottom.
 *
 * A real defence is a table of three, and the screen used to show one face
 * that changed name when the floor passed — which made the second and third
 * juror's questions feel like the same person changing their mind. All three
 * sit there now; the one speaking lights up and the others wait, the way the
 * eyes in a real room move from one chair to the next.
 */

export interface JurorSeat {
  tag: JurorTag;
  name: string;
  title: string;
  initials: string;
}

export function JuryRow({
  jury,
  active,
  speaking,
  level,
  measured,
  compact = false,
}: {
  jury: JurorSeat[];
  active: JurorTag | null;
  speaking: boolean;
  level: () => number;
  measured: () => boolean;
  /** Smaller, while the students' cameras need the room. */
  compact?: boolean;
}) {
  return (
    <ul className="grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-4">
      {jury.map((juror) => {
        const holds = juror.tag === active;
        const talking = holds && speaking;
        return (
          <li
            key={juror.tag}
            aria-current={holds ? "true" : undefined}
            className={`flex flex-col items-center gap-2 rounded-2xl px-1.5 py-3 text-center ring-1 transition-[background-color,box-shadow,opacity] duration-300 ease-out sm:gap-3 sm:px-3 sm:py-5 ${
              holds ? "bg-white/[0.08] ring-2 ring-accent" : "bg-white/[0.03] opacity-50 ring-white/10"
            }`}
          >
            <InterviewerPresence
              initials={juror.initials}
              speaking={talking}
              level={talking && measured() ? level : undefined}
              size={compact ? 56 : 88}
              className={compact ? "" : "scale-75 sm:scale-100"}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cream-bright sm:text-base">{juror.name}</p>
              <p className="line-clamp-2 text-xs text-cream-dim">{juror.title}</p>
            </div>
            <Waveform
              active={talking}
              level={level}
              measured={measured}
              label={juror.name}
              className={`text-accent transition-opacity duration-200 ${talking ? "opacity-100" : "opacity-0"}`}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Whether a stream carries a video track that is actually sending frames. */
function useLiveVideo(stream: MediaStream | null): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!stream) {
      setLive(false);
      return;
    }
    const check = () => setLive(stream.getVideoTracks().some((track) => track.readyState === "live" && !track.muted));
    check();
    const tracks = stream.getVideoTracks();
    for (const track of tracks) {
      track.addEventListener("mute", check);
      track.addEventListener("unmute", check);
      track.addEventListener("ended", check);
    }
    stream.addEventListener("addtrack", check);
    stream.addEventListener("removetrack", check);
    return () => {
      for (const track of tracks) {
        track.removeEventListener("mute", check);
        track.removeEventListener("unmute", check);
        track.removeEventListener("ended", check);
      }
      stream.removeEventListener("addtrack", check);
      stream.removeEventListener("removetrack", check);
    };
  }, [stream]);
  return live;
}

/**
 * One person defending: their camera, or their initials when it is off.
 *
 * A remote tile plays its sound through the same element — the classmate's
 * voice and, from the host, the jury's. Your own tile is muted and mirrored,
 * as every call does it.
 */
export function PersonTile({
  name,
  stream,
  self = false,
  answering = false,
  muted = false,
  note,
  label,
}: {
  name: string;
  stream: MediaStream | null;
  self?: boolean;
  /** Holds the floor: the answer being given is theirs. */
  answering?: boolean;
  /** Their microphone is closed. */
  muted?: boolean;
  /** Shown instead of the picture, e.g. why the camera is off. */
  note?: string | null;
  /** For screen readers: "Tú", "Luis". */
  label: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const live = useLiveVideo(stream);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    if (stream) void element.play().catch(() => undefined);
  }, [stream]);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <figure
      className={`relative aspect-video w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] shadow-float ring-1 transition-shadow duration-200 sm:w-44 ${
        answering ? "ring-2 ring-grow" : "ring-white/15"
      }`}
    >
      {/* Always mounted: a remote tile's sound comes out of this element
          even while their camera is off. */}
      <video
        ref={video}
        muted={self}
        playsInline
        aria-label={label}
        className={`h-full w-full object-cover ${self ? "scale-x-[-1]" : ""} ${live ? "" : "invisible absolute"}`}
      />
      {!live && (
        <div className="grid h-full w-full place-items-center">
          {note ? (
            <p className="flex items-center gap-1.5 px-2 text-center text-xs text-cream-dim">
              <VideoOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {note}
            </p>
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-grow/20 text-sm font-semibold text-cream-bright sm:h-12 sm:w-12">
              {initials || "…"}
            </span>
          )}
        </div>
      )}
      <figcaption className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1 truncate">
        <span className="truncate rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-cream-bright backdrop-blur-xl">
          {name}
        </span>
        {muted && (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-black/60" aria-hidden>
            <MicOff className="h-3 w-3 text-cream-dim" />
          </span>
        )}
      </figcaption>
    </figure>
  );
}
