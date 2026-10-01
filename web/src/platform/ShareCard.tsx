import { useEffect, useRef, useState } from "react";
import { Action, Eyebrow, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { useT } from "@/hooks/useLocale";
import { fetchHistory } from "@/lib/api";
import { shareStats, type ShareStat } from "@/lib/share-stats";
import {
  CROPS,
  frameFor,
  placeCover,
  previewSize,
  ratioFor,
  type Crop,
  type Pan,
  type Size,
} from "@/lib/share-frame";

/**
 * A photograph of your own, with your practice on top of it.
 *
 * The thing being built is distribution: every story posted from here is the
 * only advertising this product gets that nobody paid for. Which sets the bar
 * — not "does it work" but "would somebody put this on their Instagram next to
 * posts made with better tools than ours". A crop that feels coarse or type
 * that looks pasted on means it never gets posted, and the feature is then
 * just weight on a screen.
 *
 * Nothing leaves the device. The file is read with `createObjectURL` and drawn
 * into a canvas; there is no upload, no endpoint and no stored image. That is
 * a privacy decision first — these are photographs of somebody's face — and it
 * also means this feature costs nothing to run and cannot leak what it never
 * received.
 *
 * This step is the frame: choosing a picture, choosing a shape, and dragging
 * the picture inside it. The stats, the colours and the export land on top of
 * it next, which is why the canvas already draws at export resolution rather
 * than at preview size.
 */
export function ShareCard() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>("original");
  const [custom, setCustom] = useState<Size>({ width: 4, height: 5 });
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [stats, setStats] = useState<ShareStat[]>([]);

  useEffect(() => {
    // The card is drawn from history the client already loads elsewhere. A
    // failure here is not worth a message: it costs the stats, not the photo,
    // and the screen is still the thing they came for.
    fetchHistory()
      .then((result) => setStats(shareStats(result.sessions)))
      .catch(() => undefined);
  }, []);

  /**
   * The object URL, revoked when it is replaced or the screen closes.
   *
   * Without this each picture chosen holds its full decoded size in memory
   * until the tab is closed — which on a phone, after four or five tries at
   * framing a photo, is how this screen gets killed by the browser.
   */
  const held = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (held.current) URL.revokeObjectURL(held.current);
    },
    [],
  );

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (held.current) URL.revokeObjectURL(held.current);
    const url = URL.createObjectURL(file);
    held.current = url;
    const next = new Image();
    next.onload = () => {
      setImage(next);
      // A new picture starts centred. Keeping the previous drag would frame
      // the new one by the shape of the old one, which looks like a bug.
      setPan({ x: 0, y: 0 });
    };
    next.src = url;
  };

  const source: Size = image
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: 4, height: 5 };
  const frame = frameFor(ratioFor(crop, source, custom));

  /** Redrawn whenever anything about the geometry changes. */
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !image) return;
    element.width = frame.width;
    element.height = frame.height;
    context.clearRect(0, 0, frame.width, frame.height);
    const at = placeCover(frame, source, pan);
    context.drawImage(image, at.x, at.y, at.width, at.height);
  }, [image, frame.width, frame.height, pan.x, pan.y, source.width, source.height]);

  /**
   * Dragging, in frame coordinates rather than screen ones.
   *
   * Pointer events, so one implementation covers a finger and a mouse —
   * touch and mouse handlers side by side is how a drag ends up firing twice
   * on a laptop with a touchscreen. The movement is divided by the preview
   * scale so a centimetre of finger moves the same amount of photograph
   * regardless of how large the preview happens to be.
   */
  const dragging = useRef<{ id: number; from: Pan; at: Pan } | null>(null);
  const preview = previewSize(frame, { width: 420, height: 560 });
  const scale = preview.width / frame.width;

  const startDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = {
      id: event.pointerId,
      from: { x: event.clientX, y: event.clientY },
      at: pan,
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragging.current;
    if (!drag || drag.id !== event.pointerId) return;
    setPan({
      x: drag.at.x + (event.clientX - drag.from.x) / scale,
      y: drag.at.y + (event.clientY - drag.from.y) / scale,
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging.current?.id === event.pointerId) dragging.current = null;
  };

  return (
    <>
      <PageHeader title={t("share.title")} meta={t("share.meta")} />
      <PageBody className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Panel variant="raised" className="flex flex-col items-center gap-4 p-6">
          {image ? (
            <canvas
              ref={canvas}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              aria-label={t("share.canvasLabel")}
              className="touch-none rounded-xl"
              style={{ width: preview.width, height: preview.height, cursor: "grab" }}
            />
          ) : (
            /* The empty state is the file picker, not a message beside one.
               There is exactly one thing to do here first. */
            <label
              className="focus-ring flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong p-10 text-center"
              style={{ width: preview.width, height: preview.height }}
            >
              <span className="text-sm text-cream-bright">{t("share.pick")}</span>
              <span className="max-w-[18rem] text-xs text-cream-faint">
                {t("share.private")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => choose(event.target.files?.[0])}
              />
            </label>
          )}

          {image && (
            <label className="focus-ring cursor-pointer text-xs text-cream-faint underline underline-offset-4">
              {t("share.replace")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => choose(event.target.files?.[0])}
              />
            </label>
          )}
        </Panel>

        <div className="flex w-full flex-col gap-4 lg:max-w-sm">
          <Panel className="flex flex-col gap-4 p-6">
            <Eyebrow>{t("share.crop")}</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {CROPS.map((option) => (
                <Action
                  key={option}
                  tone={option === crop ? "solid" : "glass"}
                  onClick={() => {
                    setCrop(option);
                    // The drag that framed one shape is wrong for the next:
                    // what was centred in a square sits off-centre in a story.
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  {option === "original"
                    ? t("share.cropOriginal")
                    : option === "custom"
                      ? t("share.cropCustom")
                      : option}
                </Action>
              ))}
            </div>

            {crop === "custom" && (
              <div className="flex items-end gap-2">
                <RatioField
                  label={t("share.width")}
                  value={custom.width}
                  onChange={(width) => setCustom((held) => ({ ...held, width }))}
                />
                <span className="pb-2 text-cream-faint">:</span>
                <RatioField
                  label={t("share.height")}
                  value={custom.height}
                  onChange={(height) => setCustom((held) => ({ ...held, height }))}
                />
              </div>
            )}

            {image && (
              <p className="text-xs text-cream-faint">
                {t("share.dragHint", {
                  width: String(frame.width),
                  height: String(frame.height),
                })}
              </p>
            )}
          </Panel>

          {/* Shown now, used next. Somebody arriving at this screen should be
              able to see what it will put on their photograph before they
              spend a minute framing one. */}
          <Panel className="flex flex-col gap-3 p-6">
            <Eyebrow>{t("share.yourStats")}</Eyebrow>
            {stats.length === 0 ? (
              <p className="text-xs text-cream-dim">{t("share.noStats")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.map((stat) => (
                  <li key={stat.id} className="flex items-baseline gap-2">
                    <span className="text-lg text-cream-bright">{stat.value}</span>
                    <span className="text-xs text-cream-dim">{t(stat.labelKey)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
}

/** One half of a custom ratio. Clamped, because 0 is not a ratio. */
function RatioField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-cream-faint">
      {label}
      <input
        type="number"
        min={1}
        max={99}
        value={value}
        onChange={(event) =>
          onChange(Math.min(99, Math.max(1, Number(event.target.value) || 1)))
        }
        className="focus-ring w-20 rounded-lg border border-line-strong bg-transparent px-3 py-2 text-sm text-cream-bright"
      />
    </label>
  );
}
