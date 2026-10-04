"""Lay shots from any source over an existing voice track.

    python broll.py edl/story-es.json out/story/raw-es.mp4 out/story/broll-es.mp4 --media out/media

The edit list names each shot's source (relative to --media), where it starts
and how long it runs. Shots play back to back from 0 s, and their lengths must
add up to the voice track's, so a cut never drifts against the words.

Footage that is not ours (`"stock": true`) is graded toward the product's dark
screens so the cut does not jump from a white office to near-black: a little
darker, a little less saturated, a soft vignette.

A shot can carry `texts`, each `{"text", "at"}` with `at` in seconds from the
shot's start: a line in Inter that fades in and rises 28 px, timed to the words
it repeats, and holds until the shot ends. A shot with text gets a dark scrim at
the top so white walls never swallow it. Text sits between 300 and 900 px from
the top: below what Instagram covers with the profile bar, above the faces.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from cues import duration

W, H, FPS = 1080, 1920, 30
GRADE = "eq=brightness=-0.035:contrast=1.04:saturation=0.82,vignette=angle=PI/5"
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "fonts")
INK = (242, 239, 230)  # the off-white of the product's headings
TEXT_X, TEXT_Y, LINE_GAP = 84, 330, 1.12
RISE, FADE = 28, 0.3


def font(size, weight):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Inter-{weight}.ttf"), size)


def scrim_png(path):
    """Dark at the top, clear by 1000 px: enough for white text on a white wall."""
    a = np.clip(1 - np.arange(H) / 1000, 0, 1) ** 1.6 * 0.72
    img = np.zeros((H, W, 4), np.uint8)
    img[..., 3] = (a[:, None] * 255).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(path)


def text_png(path, text, size, weight, y):
    """One line, with a soft shadow, on a transparent frame the size of the video."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = font(size, weight)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((TEXT_X, y + 4), text, font=f, fill=(0, 0, 0, 150))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(img).text((TEXT_X, y), text, font=f, fill=INK + (255,))
    img.save(path)


def fitted_size(texts, size):
    """The shot's size, shrunk until its longest line keeps the same margin on the right."""
    while size > 40:
        widest = max(font(size, t.get("weight", 700)).getlength(t["text"]) for t in texts)
        if widest <= W - 2 * TEXT_X:
            return size
        size -= 2
    return size


def layout(shots):
    """Absolute times and positions for every line, stacked per shot.

    A shot can move its block (`text_y`) and size it (`text_size`) to stay off
    a face; every line in a shot shares one size so the block reads as one.
    """
    lines, start = [], 0.0
    for s in shots:
        texts = s.get("texts", [])
        if texts:
            size = fitted_size(texts, s.get("text_size", 92))
            y = s.get("text_y", TEXT_Y)
            for t in texts:
                lines.append({"text": t["text"], "size": size, "weight": t.get("weight", 700),
                              "y": y, "start": start + t["at"], "end": start + s["dur"]})
                y += int(size * LINE_GAP)
        start += s["dur"]
    return lines


def shot_filter(i, shot):
    zoom = shot.get("zoom", 1.0)
    w, h = int(W * zoom) // 2 * 2, int(H * zoom) // 2 * 2
    y = shot.get("anchor_y", 0.5)  # 0 keeps the top, 1 keeps the bottom
    f = [
        f"trim=start={shot['in']}:duration={shot['dur']}",
        "setpts=PTS-STARTPTS",
        f"fps={FPS}",
        f"scale={w}:{h}:force_original_aspect_ratio=increase",
        f"crop={W}:{H}:(iw-{W})/2:(ih-{H})*{y}",
    ]
    if shot.get("stock"):
        f.append(GRADE)
    f += ["setsar=1", "format=yuv420p"]
    return f"[{i}:v]{','.join(f)}[v{i}]"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl")
    ap.add_argument("voice", help="video or audio whose sound track is kept")
    ap.add_argument("out")
    ap.add_argument("--media", default=".")
    args = ap.parse_args()

    with open(args.edl) as f:
        shots = json.load(f)["shots"]
    total = sum(s["dur"] for s in shots)
    voice_len = duration(args.voice)
    if abs(total - voice_len) > 0.05:
        sys.exit(f"shots run {total:.2f}s but the voice runs {voice_len:.2f}s")

    inputs, graph = [], []
    for i, s in enumerate(shots):
        src = os.path.join(args.media, s["src"])
        if s["in"] + s["dur"] > duration(src) + 0.01:
            sys.exit(f"shot {i} ({s['src']}) runs past the end of its source")
        inputs += ["-i", src]
        graph.append(shot_filter(i, s))
    n = len(shots)
    graph.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[base]")

    tmp = tempfile.mkdtemp()
    last, k = "base", n + 1  # input n is the voice
    scrim = os.path.join(tmp, "scrim.png")
    scrim_png(scrim)
    start = 0.0
    for s in shots:
        if s.get("texts"):
            inputs += ["-loop", "1", "-i", scrim]
            end = start + s["dur"]
            graph.append(f"[{last}][{k}:v]overlay=0:0:shortest=1:enable='between(t,{start:.3f},{end - 0.001:.3f})'[o{k}]")
            last, k = f"o{k}", k + 1
        start += s["dur"]
    for j, ln in enumerate(layout(shots)):
        png = os.path.join(tmp, f"line{j}.png")
        text_png(png, ln["text"], ln["size"], ln["weight"], ln["y"])
        inputs += ["-loop", "1", "-i", png]
        st, en = ln["start"], ln["end"]
        graph.append(
            f"[{k}:v]format=rgba,fade=t=in:st={st:.3f}:d={FADE}:alpha=1[t{k}];"
            f"[{last}][t{k}]overlay=x=0:y='{RISE}*max(0,1-(t-{st:.3f})/{FADE * 1.6:.3f})':shortest=1:"
            f"enable='between(t,{st:.3f},{en - 0.001:.3f})'[o{k}]")
        last, k = f"o{k}", k + 1
    graph.append(f"[{last}]null[v]")

    voice_in = ["-i", args.voice]
    inputs = inputs[: 2 * n] + voice_in + inputs[2 * n:]
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *inputs,
         "-filter_complex", ";".join(graph), "-map", "[v]", "-map", f"{n}:a",
         "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "256k", "-shortest", args.out], check=True)
    print(f"{args.out}: {n} shots, {total:.2f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
