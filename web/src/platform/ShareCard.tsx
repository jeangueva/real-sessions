import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Action, Eyebrow, FadeRise, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { useT } from "@/hooks/useLocale";
import { fetchHistory } from "@/lib/api";
import { shareStats, type ShareStat } from "@/lib/share-stats";
import { track } from "@/lib/analytics";
import {
  availableTemplates,
  fittingScale,
  templateById,
  type ShareTemplate,
  type TemplateId,
} from "@/lib/share-templates";
import {
  overlayOnlySize,
  overlayOrigin,
  SHARE_FONT,
  type Measure,
  type OverlayStat,
} from "@/lib/share-overlay";
import { BACKGROUNDS, backgroundById, type BackgroundId } from "@/lib/share-backgrounds";
import {
  clampZoom,
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
 * A card about your own practice, made to be posted.
 *
 * Built in the order Coros uses, because watching the three apps that do this
 * well makes the order look inevitable: choose the ground, crop it, then look
 * at the result and send it. The earlier version put every control on one
 * screen at once, which is the arrangement none of them chose.
 *
 * The design is picked, not assembled. Strava, Coros and Aura all show a
 * gallery of finished arrangements rather than asking which numbers to
 * include — choosing from pictures takes a second and always looks composed;
 * choosing from checkboxes takes a minute and usually does not.
 *
 * Nothing leaves the device until the person shares it. The photograph is read
 * with `createObjectURL` and drawn into a canvas; there is no upload and no
 * stored image.
 */

type Step = "ground" | "crop" | "ready";

export function ShareCard() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const [stats, setStats] = useState<ShareStat[]>([]);
  const [step, setStep] = useState<Step>("ground");

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState<BackgroundId>("none");
  const [templateId, setTemplateId] = useState<TemplateId>("stack");
  const [crop, setCrop] = useState<Crop>("9:16");
  const [custom, setCustom] = useState<Size>({ width: 4, height: 5 });
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cardAt, setCardAt] = useState<Pan>({ x: 0.04, y: 0.74 });
  const [colour, setColour] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then((result) => {
        const available = shareStats(result.sessions);
        setStats(available);
        const first = availableTemplates(available)[0];
        if (first) setTemplateId(first.id);
      })
      .catch(() => undefined);
  }, []);

  /** Revoked on replace and on unmount — see the note in the drag handler. */
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
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setBackground("none");
      setStep("crop");
    };
    next.src = url;
  };

  const source: Size = image
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: 4, height: 5 };
  const frame = frameFor(ratioFor(crop, source, custom));

  const template: ShareTemplate = templateById(templateId);
  const drawn: OverlayStat[] = template
    .pick(stats)
    .map((stat) => ({ value: stat.value, label: t(stat.labelKey) }));

  /** A context kept only to measure text in the font the browser resolved. */
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

  /**
   * Paints the whole card into any context, at any size.
   *
   * One function for the preview, the export and the gallery thumbnails, so
   * what somebody picks is what they get rather than three drawings that
   * agree by coincidence.
   */
  const paint = (
    context: CanvasRenderingContext2D,
    into: Size,
    options: { template: ShareTemplate; withGround: boolean },
  ): void => {
    context.clearRect(0, 0, into.width, into.height);
    if (options.withGround) {
      const ground = backgroundById(background);
      if (image) {
        const at = placeCover(into, source, pan, zoom);
        context.drawImage(image, at.x, at.y, at.width, at.height);
      } else if (ground.paint) {
        ground.paint(context, into);
      }
    }
    const wanted = options.template
      .pick(stats)
      .map((stat) => ({ value: stat.value, label: t(stat.labelKey) }));
    if (wanted.length === 0) return;
    const asked = { tone: "cream" as const, backdrop, scale: cardScale, ...(measure ? { measure } : {}) };
    // Never larger than the frame can hold — see `fittingScale`.
    const shared = {
      ...asked,
      scale: fittingScale(options.template, into, wanted, { ...asked, origin: { x: 0, y: 0 } }),
    };
    const size = options.template.measure(into, wanted, { ...shared, origin: { x: 0, y: 0 } });
    const origin = overlayOrigin(into, { ...size, padding: into.width * 0.04 } as never, cardAt);
    context.save();
    // A chosen colour overrides the tone's ink, which is what the picker is
    // for; without one the template uses the product's own cream.
    if (colour) context.fillStyle = colour;
    options.template.draw(context, into, wanted, { ...shared, origin });
    context.restore();
  };

  const preview = previewSize(frame, { width: 380, height: 520 });
  const scale = preview.width / frame.width;

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    element.width = frame.width;
    element.height = frame.height;
    paint(context, frame, { template, withGround: true });
  });

  /* ---- one gesture, three meanings: pinch, move the card, move the photo -- */

  const dragging = useRef<{ id: number; target: "photo" | "card"; from: Pan; at: Pan } | null>(
    null,
  );
  const touches = useRef(new Map<number, Pan>());
  const pinch = useRef<{ span: number; zoom: number } | null>(null);

  const spanOf = (): number => {
    const [a, b] = [...touches.current.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const startDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.current.size === 2) {
      pinch.current = { span: spanOf(), zoom };
      dragging.current = null;
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const at = { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
    const size = template.measure(frame, drawn, {
      origin: { x: 0, y: 0 },
      tone: "cream",
      backdrop,
      scale: cardScale,
      ...(measure ? { measure } : {}),
    });
    const padding = frame.width * 0.04;
    const origin = overlayOrigin(frame, { ...size, padding } as never, cardAt);
    const onCard =
      drawn.length > 0 &&
      at.x >= origin.x - padding &&
      at.x <= origin.x + size.width + padding &&
      at.y >= origin.y - padding &&
      at.y <= origin.y + size.height + padding;

    dragging.current = {
      id: event.pointerId,
      target: onCard ? "card" : "photo",
      from: { x: event.clientX, y: event.clientY },
      at: onCard ? cardAt : pan,
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinch.current && touches.current.size === 2) {
      const span = spanOf();
      if (span > 0 && pinch.current.span > 0) {
        setZoom(clampZoom((pinch.current.zoom * span) / pinch.current.span));
      }
      return;
    }
    const drag = dragging.current;
    if (!drag || drag.id !== event.pointerId) return;
    const moved = {
      x: (event.clientX - drag.from.x) / scale,
      y: (event.clientY - drag.from.y) / scale,
    };
    if (drag.target === "photo") {
      if (image) setPan({ x: drag.at.x + moved.x, y: drag.at.y + moved.y });
      return;
    }
    const size = template.measure(frame, drawn, {
      origin: { x: 0, y: 0 },
      tone: "cream",
      backdrop,
      scale: cardScale,
      ...(measure ? { measure } : {}),
    });
    const free = {
      x: Math.max(1, frame.width - size.width - frame.width * 0.08),
      y: Math.max(1, frame.height - size.height - frame.width * 0.08),
    };
    setCardAt({
      x: Math.min(1, Math.max(0, drag.at.x + moved.x / free.x)),
      y: Math.min(1, Math.max(0, drag.at.y + moved.y / free.y)),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    touches.current.delete(event.pointerId);
    if (dragging.current?.id === event.pointerId) dragging.current = null;
    if (touches.current.size < 2) pinch.current = null;
  };

  /* ------------------------------ handing it over ------------------------ */

  const toBlob = (element: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => element.toBlob(resolve, "image/png"));

  /**
   * Shares the file, and falls back to downloading it.
   *
   * `navigator.share` with a file is what the three apps all end on, and on
   * iOS it is the only thing that works: Safari's download puts a PNG in
   * Files, not in Photos, so a candidate who wanted to post a story ends up
   * hunting for it. The share sheet has "Save Image" and Instagram in it.
   *
   * Desktop Chrome has no file sharing, so the anchor stays — not as the
   * preferred path but as the one that exists there.
   */
  const handOver = async (blob: Blob, name: string, kind: string) => {
    const file = new File([blob], name, { type: "image/png" });
    const sharer = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[] }) => Promise<void>;
    };
    if (sharer.share && sharer.canShare?.({ files: [file] })) {
      try {
        await sharer.share({ files: [file] });
        track("progress card saved", { kind, how: "share" });
        return;
      } catch {
        // A cancelled share sheet lands here too, and silently falling back to
        // a download would hand somebody a file they just declined to send.
        return;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    track("progress card saved", { kind, how: "download" });
    setNote(t("share.saved"));
  };

  const shareCard = async () => {
    const element = canvas.current;
    if (!element) return;
    setBusy(true);
    const blob = await toBlob(element);
    setBusy(false);
    if (blob) await handOver(blob, "mockio.png", "photo");
  };

  const shareStatsOnly = async () => {
    if (drawn.length === 0) return;
    setBusy(true);
    const square = { width: frame.width, height: frame.width };
    const tight = template.measure(square, drawn, {
      origin: { x: 0, y: 0 },
      tone: "cream",
      backdrop: false,
      scale: cardScale,
      ...(measure ? { measure } : {}),
    });
    const padding = square.width * 0.04;
    const size = overlayOnlySize({ ...tight, padding } as never);
    const offscreen = document.createElement("canvas");
    offscreen.width = size.width;
    offscreen.height = size.height;
    const context = offscreen.getContext("2d");
    if (!context) return setBusy(false);
    if (colour) context.fillStyle = colour;
    template.draw(context, square, drawn, {
      origin: { x: padding, y: padding },
      tone: "cream",
      // Never a scrim: the point is transparency, and a scrim exports as a
      // grey slab over whatever it is dropped onto.
      backdrop: false,
      scale: cardScale,
      ...(measure ? { measure } : {}),
    });
    const blob = await toBlob(offscreen);
    setBusy(false);
    if (blob) await handOver(blob, "mockio-stats.png", "transparent");
  };

  /* --------------------------------- screen ------------------------------- */

  const gallery = availableTemplates(stats);

  if (stats.length === 0) {
    return (
      <>
        <PageHeader title={t("share.title")} meta={t("share.meta")} />
        <PageBody>
          <Panel variant="raised" className="max-w-xl p-6">
            <p className="text-sm text-cream-dim">{t("share.noStats")}</p>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("share.title")}
        meta={t("share.meta")}
        actions={
          /* Off the nav now, so the way out is drawn here: the first step
             leads back to the path it was opened from, the later ones step
             back through the card. */
          step !== "ground" ? (
            <Action tone="glass" onClick={() => setStep(step === "ready" ? "crop" : "ground")}>
              {t("share.back")}
            </Action>
          ) : (
            <Link to="/app/progress">
              <Action tone="glass">{t("share.toPath")}</Action>
            </Link>
          )
        }
      />

      <PageBody className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FadeRise>
        <Panel variant="raised" className="flex flex-col items-center gap-3 p-5">
          <canvas
            ref={canvas}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label={t("share.canvasLabel")}
            className="touch-none rounded-xl"
            style={{
              width: preview.width,
              height: preview.height,
              cursor: "grab",
              // The checkerboard, so "no background" reads as transparent
              // rather than as a bug.
              backgroundImage:
                background === "none" && !image
                  ? "repeating-conic-gradient(rgb(255 255 255 / 0.08) 0% 25%, transparent 0% 50%)"
                  : undefined,
              backgroundSize: "20px 20px",
            }}
          />
          <p className="max-w-xs text-center text-xs text-cream-faint">{t("share.moveHint")}</p>
        </Panel>
        </FadeRise>

        <div className="flex w-full flex-col gap-4 lg:max-w-sm">
          {step === "ground" && (
            <Panel className="flex flex-col gap-4 p-5">
              <Eyebrow>{t("share.background")}</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((entry) => (
                  <Action
                    key={entry.id}
                    tone={entry.id === background && !image ? "solid" : "glass"}
                    onClick={() => {
                      setBackground(entry.id);
                      setImage(null);
                    }}
                  >
                    {t(entry.labelKey)}
                  </Action>
                ))}
              </div>

              <label className="focus-ring flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line-strong p-4 text-center text-sm text-cream-bright">
                {image ? t("share.replace") : t("share.pick")}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => choose(event.target.files?.[0])}
                />
              </label>
              <p className="text-xs text-cream-faint">{t("share.private")}</p>

              <Action onClick={() => setStep("crop")}>{t("share.next")}</Action>
            </Panel>
          )}

          {step === "crop" && (
            <Panel className="flex flex-col gap-4 p-5">
              <Eyebrow>{t("share.crop")}</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {CROPS.map((option) => (
                  <Action
                    key={option}
                    tone={option === crop ? "solid" : "glass"}
                    onClick={() => {
                      setCrop(option);
                      setPan({ x: 0, y: 0 });
                      setZoom(1);
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
                    onChange={(width) => setCustom((h) => ({ ...h, width }))}
                  />
                  <span className="pb-2 text-cream-faint">:</span>
                  <RatioField
                    label={t("share.height")}
                    value={custom.height}
                    onChange={(height) => setCustom((h) => ({ ...h, height }))}
                  />
                </div>
              )}

              {image && (
                <label className="flex flex-col gap-1 text-xs text-cream-faint">
                  {t("share.zoom")}
                  <input
                    type="range"
                    min={100}
                    max={400}
                    value={Math.round(zoom * 100)}
                    onChange={(event) => setZoom(clampZoom(Number(event.target.value) / 100))}
                    className="focus-ring"
                  />
                </label>
              )}

              <Action onClick={() => setStep("ready")}>{t("share.next")}</Action>
            </Panel>
          )}

          {step === "ready" && (
            <>
              <Panel className="flex flex-col gap-3 p-5">
                <Eyebrow>{t("share.template")}</Eyebrow>
                <div className="grid grid-cols-2 gap-2">
                  {gallery.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={entry.id === templateId}
                      onClick={() => setTemplateId(entry.id)}
                      className={`focus-ring flex flex-col items-center gap-2 rounded-xl border p-2 ${
                        entry.id === templateId
                          ? "border-cream-faint bg-surface-raised"
                          : "border-line"
                      }`}
                    >
                      <Thumbnail template={entry} paint={paint} />
                      <span className="text-xs text-cream-dim">{t(entry.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel className="flex flex-col gap-4 p-5">
                <Eyebrow>{t("share.look")}</Eyebrow>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-cream-faint">
                    {t("share.colour")}
                    <input
                      type="color"
                      value={colour ?? "#ece9d8"}
                      onChange={(event) => setColour(event.target.value)}
                      className="focus-ring h-8 w-12 rounded border border-line bg-transparent"
                    />
                  </label>
                  {colour && (
                    <button
                      type="button"
                      onClick={() => setColour(null)}
                      className="focus-ring rounded text-xs text-cream-faint underline underline-offset-4"
                    >
                      {t("share.colourReset")}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-pressed={backdrop}
                    onClick={() => setBackdrop((h) => !h)}
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
              </Panel>

              <Panel variant="raised" className="flex flex-col gap-3 p-5">
                <Action onClick={() => void shareCard()} disabled={busy}>
                  {t("share.share")}
                </Action>
                <Action tone="glass" onClick={() => void shareStatsOnly()} disabled={busy}>
                  {t("share.shareStats")}
                </Action>
                <p className="text-xs text-cream-faint">{t("share.saveStatsWhy")}</p>
                {note && (
                  <p role="status" className="text-xs text-cream-bright">
                    {note}
                  </p>
                )}
              </Panel>
            </>
          )}
        </div>
      </PageBody>
    </>
  );
}

/** A small drawing of one template, painted by the same code as the card. */
function Thumbnail({
  template,
  paint,
}: {
  template: ShareTemplate;
  paint: (
    context: CanvasRenderingContext2D,
    into: Size,
    options: { template: ShareTemplate; withGround: boolean },
  ) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const into = { width: 240, height: 420 };
    element.width = into.width;
    element.height = into.height;
    context.fillStyle = "#17181c";
    context.fillRect(0, 0, into.width, into.height);
    paint(context, into, { template, withGround: false });
  });
  return <canvas ref={ref} className="h-28 w-16 rounded-lg" aria-hidden />;
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
        onChange={(event) => onChange(Math.min(99, Math.max(1, Number(event.target.value) || 1)))}
        className="focus-ring w-20 rounded-lg border border-line-strong bg-transparent px-3 py-2 text-sm text-cream-bright"
      />
    </label>
  );
}
