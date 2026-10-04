"""Lay shots from any source over an existing voice track.

    python broll.py edl/story-es.json out/story/raw-es.mp4 out/story/broll-es.mp4 --media out/media

The edit list names each shot's source (relative to --media), where it starts
and how long it runs. Shots play back to back from 0 s, and their lengths must
add up to the voice track's, so a cut never drifts against the words.

Footage that is not ours (`"stock": true`) is graded toward the product's dark
screens so the cut does not jump from a white office to near-black: a little
darker, a little less saturated, a soft vignette.
"""
import argparse
import json
import os
import subprocess
import sys

from cues import duration

W, H, FPS = 1080, 1920, 30
GRADE = "eq=brightness=-0.035:contrast=1.04:saturation=0.82,vignette=angle=PI/5"


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
    graph.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[v]")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *inputs, "-i", args.voice,
         "-filter_complex", ";".join(graph), "-map", "[v]", "-map", f"{n}:a",
         "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p",
         "-c:a", "copy", "-shortest", args.out], check=True)
    print(f"{args.out}: {n} shots, {total:.2f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
