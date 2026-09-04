import type { ReactNode } from "react";
import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

/**
 * The bar along the bottom, borrowed wholesale from every video call the
 * candidate has ever been on.
 *
 * That familiarity is the point rather than decoration. This screen is meant
 * to feel like the thing it rehearses, and an interface someone already knows
 * how to use is one less thing between them and being nervous about the right
 * subject.
 *
 * Which also sets the limit: a control that looks like Meet's has to behave
 * like Meet's. Screen share is disabled and says so, rather than being drawn
 * live and doing nothing.
 */

function ControlButton({
  label,
  onClick,
  active = false,
  danger = false,
  disabled = false,
  title,
  children,
}: {
  label: string;
  onClick?: () => void;
  /** Lit, as in "your microphone is on" — not "this button is selected". */
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const tone = danger
    ? "bg-red-500/90 text-white hover:bg-red-500"
    : active
      ? "bg-cream text-surface-base"
      : "border border-line text-cream-dim hover:text-cream-bright";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={danger || disabled ? undefined : active}
      title={title ?? label}
      className={`focus-ring grid h-12 w-12 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tone}`}
    >
      {children}
    </button>
  );
}

export function CallControls({
  micOn,
  micSupported,
  onToggleMic,
  cameraOn,
  cameraSupported,
  onToggleCamera,
  sharing,
  shareSupported,
  onToggleShare,
  panelOpen,
  onTogglePanel,
  onLeave,
  leaveLabel,
}: {
  micOn: boolean;
  micSupported: boolean;
  onToggleMic: () => void;
  cameraOn: boolean;
  cameraSupported: boolean;
  onToggleCamera: () => void;
  sharing: boolean;
  shareSupported: boolean;
  onToggleShare: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onLeave: () => void;
  leaveLabel: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <ControlButton
        label={micOn ? "Mute microphone" : "Unmute microphone"}
        active={micOn}
        disabled={!micSupported}
        onClick={onToggleMic}
        title={micSupported ? undefined : "This browser cannot record audio"}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </ControlButton>

      <ControlButton
        label={cameraOn ? "Turn camera off" : "Turn camera on"}
        active={cameraOn}
        disabled={!cameraSupported}
        onClick={onToggleCamera}
        title="Only you ever see this. Nothing is sent or recorded."
      >
        {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </ControlButton>

      {/* Nobody is on the far end to see it, and it is still worth having:
          walking a portfolio or a diagram through out loud is its own skill,
          and it reads differently when the thing is actually on screen. */}
      <ControlButton
        label={sharing ? "Stop sharing your screen" : "Share your screen"}
        active={sharing}
        disabled={!shareSupported}
        onClick={onToggleShare}
        title={
          shareSupported
            ? "Only you see it. Nothing is sent or recorded."
            : "This browser cannot share a screen"
        }
      >
        <MonitorUp className="h-5 w-5" />
      </ControlButton>

      <ControlButton
        label={panelOpen ? "Hide transcript" : "Show transcript"}
        active={panelOpen}
        onClick={onTogglePanel}
      >
        <MessageSquare className="h-5 w-5" />
      </ControlButton>

      <ControlButton label={leaveLabel} danger onClick={onLeave}>
        <PhoneOff className="h-5 w-5" />
      </ControlButton>
    </div>
  );
}
