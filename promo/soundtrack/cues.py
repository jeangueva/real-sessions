"""Read a rendered cut and find where things happen: spoken lines, scene changes,
small UI moments and the logo. Everything downstream is placed on these times, so
a re-render with a different voice (and different timing) needs no hand edits.
"""
import json
import re
import subprocess

import numpy as np

W, H, FPS = 54, 96, 10


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def voice_lines(path, dur, floor_db=-35, min_gap=0.6):
    log = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-vn", "-af",
         f"silencedetect=n={floor_db}dB:d={min_gap}", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    ends += [dur] * (len(starts) - len(ends))
    lines, cur = [], 0.0
    for s, e in zip(starts, ends):
        if s - cur > 0.25:
            lines.append([round(cur, 2), round(s, 2)])
        cur = e
    if dur - cur > 0.25:
        lines.append([round(cur, 2), round(dur, 2)])
    return lines


def _frames(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS},scale={W}:{H},format=gray",
         "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def visual_events(path):
    f = _frames(path)
    luma = f.mean(axis=(1, 2))
    # Scene changes: the screen empties between scenes, so luma dips well below
    # what surrounds it.
    k = int(1.5 * FPS)
    scenes = []
    for i in range(k, len(luma) - 3):
        win = luma[max(0, i - k): i + k + 1]
        if luma[i] == win.min() and win.max() - luma[i] > 3.0:
            t = (i + 1) / FPS
            if not scenes or t - scenes[-1] > 1.5:
                scenes.append(round(t, 1))
    # UI moments: a block of the frame changes after it had been still
    # (a card lands, a bar fills, a number appears).
    blocks = f[:, : H // 6 * 6, : W // 6 * 6].reshape(len(f), H // 6, 6, W // 6, 6).mean(axis=(2, 4))
    change = np.abs(np.diff(blocks, axis=0)).max(axis=(1, 2))
    active = change > 6.0
    ui, still = [], 0
    for i, a in enumerate(active):
        t = (i + 1) / FPS
        if a and still >= 3 and all(abs(t - s) > 0.7 for s in scenes) and t > 0.5:
            if not ui or t - ui[-1] > 0.35:
                ui.append(round(t, 1))
        still = 0 if a else still + 1
    return scenes, ui


def detect(path):
    dur = duration(path)
    scenes, ui = visual_events(path)
    lines = voice_lines(path, dur)
    # The logo is the first thing to land in the last scene.
    last = scenes[-1] if scenes else dur - 4
    after = [t for t in ui if t > last + 0.5]
    logo = after[0] if after else min(dur - 2.5, last + 1.4)
    ui = [t for t in ui if abs(t - logo) > 0.3]
    # Musical sections follow the story: quiet setup, the turn, the practice
    # (where the pulse comes in), the resolve on the logo.
    turn = scenes[1] if len(scenes) > 1 else dur * 0.45
    pulse = scenes[2] if len(scenes) > 2 else dur * 0.6
    return {
        "duration": round(dur, 3),
        "lines": lines,
        "scenes": scenes,
        "ui": ui,
        "logo": logo,
        "sections": {"turn": turn, "pulse": pulse, "resolve": logo},
    }


if __name__ == "__main__":
    import sys
    print(json.dumps(detect(sys.argv[1]), indent=2))
