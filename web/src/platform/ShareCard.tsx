import { useEffect, useRef, useState } from "react";
import { Action, Eyebrow, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { useT } from "@/hooks/useLocale";
import { fetchHistory } from "@/lib/api";
import { defaultStats, shareStats, type ShareStat, type ShareStatId } from "@/lib/share-stats";
import {
  drawOverlay,
  layoutOverlay,
  type Measure,
  overlayOnlySize,
  overlayOrigin,
  TONES,
  type OverlayStat,
  type Tone,
  SHARE_FONT,
} from "@/lib/share-overlay";
import { track } from "@/lib/analytics";
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
  /**
   * Which stats are on the card, in the order they were chosen.
   *
   * A list rather than a set, because the order is the composition: the first
   * one is the big number at the top and people pick their headline first.
   */
  const [chosen, setChosen] = useState<ShareStatId[]>([]);
  const [tone, setTone] = useState<Tone>("cream");
  const [backdrop, setBackdrop] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  /** Where the card sits, as a fraction of the room it has. Survives a recrop. */
  const [cardAt, setCardAt] = useState<Pan>({ x: 0.04, y: 0.78 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The card is drawn from history the client already loads elsewhere. A
    // failure here is not worth a message: it costs the stats, not the photo,
    // and the screen is still the thing they came for.
    fetchHistory()
      .then((result) => {
        const available = shareStats(result.sessions);
        setStats(available);
        setChosen(defaultStats(available));
      })
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

  /**
   * The stats as they will be drawn: value, and the label in the reader's
   * language. Resolved here because the overlay knows nothing about locales.
   */
  const drawn: OverlayStat[] = chosen
    .map((id) => stats.find((stat) => stat.id === id))
    .filter((stat): stat is ShareStat => Boolean(stat))
    .map((stat) => ({ value: stat.value, label: t(stat.labelKey) }));

  /**
   * A context kept only to measure text.
   *
   * The layout needs the width of the words as they will actually be drawn,
   * in the font the browser actually resolved. Estimating from the character
   * count made the scrim narrower than the text inside it and clipped the
   * transparent export — neither of which any test can see, because no test
   * draws.
   */
  const ruler = useRef<CanvasRenderingContext2D | null>(null);
  if (!ruler.current && typeof document !== "undefined") {
    ruler.current = document.createElement("canvas").getContext("2d");
  }
  const measure: Measure | undefined = ruler.current
    ? (text, weight, size) => {
        const context = ruler.current!;
        context.font = `${weight} ${size}px ${SHARE_FONT}`;
        return context.measureText(text).width;
      }
    : undefined;

  const layout = layoutOverlay(frame, drawn, cardScale, measure);

  /** Redrawn whenever anything about the picture or the card changes. */
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !image) return;
    element.width = frame.width;
    element.height = frame.height;
    context.clearRect(0, 0, frame.width, frame.height);
    const at = placeCover(frame, source, pan);
    context.drawImage(image, at.x, at.y, at.width, at.height);
    if (drawn.length > 0) {
      drawOverlay(context, layout, drawn, {
        origin: overlayOrigin(frame, layout, cardAt),
        tone,
        backdrop,
      });
    }
  });

  /**
   * Dragging, in frame coordinates rather than screen ones.
   *
   * Pointer events, so one implementation covers a finger and a mouse —
   * touch and mouse handlers side by side is how a drag ends up firing twice
   * on a laptop with a touchscreen. The movement is divided by the preview
   * scale so a centimetre of finger moves the same amount of photograph
   * regardless of how large the preview happens to be.
   */
  const dragging = useRef<{
    id: number;
    target: "photo" | "card";
    from: Pan;
    at: Pan;
  } | null>(null);
  const preview = previewSize(frame, { width: 420, height: 560 });
  const scale = preview.width / frame.width;

  /**
   * One gesture, two meanings, decided by where it starts.
   *
   * A drag that begins on the card moves the card; anywhere else reframes the
   * photograph. Separate controls for "move card" and "move photo" would be
   * two modes to explain, and nobody reads the explanation — whereas grabbing
   * the thing you want to move is how every other editor on a phone behaves.
   */
  const startDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const box = event.currentTarget.getBoundingClientRect();
    // Pointer position in frame coordinates, which is what the layout is in.
    const at = {
      x: (event.clientX - box.left) / scale,
      y: (event.clientY - box.top) / scale,
    };
    const origin = overlayOrigin(frame, layout, cardAt);
    const onCard =
      drawn.length > 0 &&
      at.x >= origin.x - layout.padding &&
      at.x <= origin.x + layout.width + layout.padding &&
      at.y >= origin.y - layout.padding &&
      at.y <= origin.y + layout.height + layout.padding;

    dragging.current = {
      id: event.pointerId,
      target: onCard ? "card" : "photo",
      from: { x: event.clientX, y: event.clientY },
      at: onCard ? cardAt : pan,
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragging.current;
    if (!drag || drag.id !== event.pointerId) return;
    const moved = {
      x: (event.clientX - drag.from.x) / scale,
      y: (event.clientY - drag.from.y) / scale,
    };
    if (drag.target === "photo") {
      setPan({ x: drag.at.x + moved.x, y: drag.at.y + moved.y });
      return;
    }
    // The card's position is a fraction of the room it has, so the movement
    // has to be divided by that room rather than by the frame.
    const free = {
      x: Math.max(1, frame.width - layout.width - layout.padding * 2),
      y: Math.max(1, frame.height - layout.height - layout.padding * 2),
    };
    setCardAt({
      x: Math.min(1, Math.max(0, drag.at.x + moved.x / free.x)),
      y: Math.min(1, Math.max(0, drag.at.y + moved.y / free.y)),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging.current?.id === event.pointerId) dragging.current = null;
  };

  /**
   * Hands a blob to the browser as a file.
   *
   * An anchor with `download` rather than the Web Share API: sharing a file
   * from a browser is unavailable on desktop Chrome, inconsistent on Android,
   * and on iOS opens a sheet that does not include Instagram Stories anyway.
   * A file in the camera roll is the thing every one of those paths was trying
   * to produce, and the candidate takes it from there.
   */
  const handOver = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    // Not immediately: revoking before the browser has read the blob cancels
    // the download on Safari.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const saveCard = () => {
    const element = canvas.current;
    if (!element) return;
    setSaving(true);
    element.toBlob((blob) => {
      setSaving(false);
      if (!blob) return;
      handOver(blob, "mockio.png");
      track("progress card saved", { kind: "photo" });
    }, "image/png");
  };

  /**
   * The stats alone, on transparency.
   *
   * This is what makes the feature cover video without this app ever touching
   * a video: re-encoding one in the browser means twenty-five megabytes of
   * ffmpeg.wasm and a minute of work on a phone, while a transparent PNG drops
   * onto a clip in Instagram or CapCut in ten seconds. It is also just useful
   * on its own, which is the other half of why it exists.
   */
  const saveStatsOnly = () => {
    if (drawn.length === 0) return;
    // Laid out against a square of the export width so the type comes out the
    // same size as on the photo version, then cropped to the block.
    const square = { width: frame.width, height: frame.width };
    const tight = layoutOverlay(square, drawn, cardScale, measure);
    const size = overlayOnlySize(tight);
    const offscreen = document.createElement("canvas");
    offscreen.width = size.width;
    offscreen.height = size.height;
    const context = offscreen.getContext("2d");
    if (!context) return;
    setSaving(true);
    drawOverlay(context, tight, drawn, {
      origin: { x: tight.padding, y: tight.padding },
      tone,
      // Never a scrim here. The whole point is transparency, and a scrim
      // would export as a grey slab over whatever it is dropped onto.
      backdrop: false,
    });
    offscreen.toBlob((blob) => {
      setSaving(false);
      if (!blob) return;
      handOver(blob, "mockio-stats.png");
      track("progress card saved", { kind: "transparent" });
    }, "image/png");
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

          <Panel className="flex flex-col gap-4 p-6">
            <Eyebrow>{t("share.yourStats")}</Eyebrow>
            {stats.length === 0 ? (
              <p className="text-xs text-cream-dim">{t("share.noStats")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.map((stat) => {
                  const on = chosen.includes(stat.id);
                  return (
                    <button
                      key={stat.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setChosen((held) =>
                          held.includes(stat.id)
                            ? held.filter((id) => id !== stat.id)
                            : // Three is the ceiling. A fourth row stops being
                              // a caption and starts being a table over
                              // somebody's face.
                              held.length >= 3
                              ? held
                              : [...held, stat.id],
                        )
                      }
                      className={`focus-ring flex items-baseline gap-2 rounded-xl border px-3 py-2 text-left ${
                        on ? "border-cream-faint bg-surface-raised" : "border-line"
                      }`}
                    >
                      <span className="text-lg text-cream-bright">{stat.value}</span>
                      <span className="text-xs text-cream-dim">{t(stat.labelKey)}</span>
                      {stat.sensitive && (
                        /* Said out loud rather than hidden. Some people are
                           proud of their score; the rest should know what
                           they would be publishing. */
                        <span className="ml-auto text-[0.65rem] uppercase tracking-wide text-cream-faint">
                          {t("share.statPrivate")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          {drawn.length > 0 && (
            <Panel className="flex flex-col gap-4 p-6">
              <Eyebrow>{t("share.look")}</Eyebrow>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(TONES) as Tone[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={t(`share.tone.${option}` as never)}
                    aria-pressed={option === tone}
                    onClick={() => setTone(option)}
                    className={`focus-ring h-8 w-8 rounded-full border-2 ${
                      option === tone ? "border-cream-bright" : "border-line"
                    }`}
                    style={{ background: TONES[option].ink }}
                  />
                ))}
                <button
                  type="button"
                  aria-pressed={backdrop}
                  onClick={() => setBackdrop((held) => !held)}
                  className={`focus-ring rounded-full border px-3 py-1.5 text-xs ${
                    backdrop ? "border-cream-faint text-cream-bright" : "border-line text-cream-dim"
                  }`}
                >
                  {t("share.backdrop")}
                </button>
              </div>

              <label className="flex flex-col gap-1 text-xs text-cream-faint">
                {t("share.size")}
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={Math.round(cardScale * 100)}
                  onChange={(event) => setCardScale(Number(event.target.value) / 100)}
                  className="focus-ring"
                />
              </label>

              <p className="text-xs text-cream-faint">{t("share.moveHint")}</p>
            </Panel>
          )}

          {image && drawn.length > 0 && (
            <Panel variant="raised" className="flex flex-col gap-3 p-6">
              <Action onClick={saveCard} disabled={saving}>
                {t("share.save")}
              </Action>
              <Action tone="glass" onClick={saveStatsOnly} disabled={saving}>
                {t("share.saveStats")}
              </Action>
              {/* The reason the transparent file exists, said where the button
                  is rather than in a help page nobody opens. */}
              <p className="text-xs text-cream-faint">{t("share.saveStatsWhy")}</p>
            </Panel>
          )}
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
