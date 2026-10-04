"""Put music and sound design under a rendered cut, ducked under the voice.

    python mix.py in.mp4 out.mp4            # voice = the cut's own audio
    python mix.py in.mp4 out.mp4 --voice v.wav
    python mix.py in.mp4 out.mp4 --cues cues.json   # after hand-editing the cues

Writes out.mp4 plus out.cues.json and the stems (voice, music, sfx) next to it.
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

import cues as cue_detect
import music
import sfx
from dsp import SR, db, highpass, soft_limit

# Levels relative to the voice while it speaks, in dB.
MUSIC_UNDER = -9    # music between lines (a cut can set its own in the cues)
DUCK = 5            # how far music dips while somebody is talking
SFX_PEAK = -5.5     # loudest audible effect (the logo), against the voice
TARGET_LUFS = -14   # what Instagram, TikTok and YouTube normalise to
TRUE_PEAK = -2.0
ENCODED_CEILING = -1.0  # true peak of the AAC that ships


def load_audio(path, n):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, np.float32).reshape(-1, 2).T.copy()
    out = np.zeros((2, n), np.float32)
    out[:, : min(n, x.shape[1])] = x[:, :n]
    return out


def envelope(x, block=0.01):
    """Voice level in dB per 10 ms block, with a fast attack and a slow release."""
    b = int(block * SR)
    m = x.shape[1] // b
    rms = np.sqrt((x[:, : m * b].reshape(2, m, b) ** 2).mean(axis=(0, 2)) + 1e-12)
    lvl = 20 * np.log10(rms)
    att, rel = np.exp(-block / 0.03), np.exp(-block / 0.35)
    out = np.empty_like(lvl)
    cur = -120.0
    for i, v in enumerate(lvl):
        k = att if v > cur else rel
        cur = k * cur + (1 - k) * v
        out[i] = cur
    look = int(0.08 / block)  # start ducking just before the word
    out = np.concatenate([out[look:], np.full(look, out[-1])])
    return out, b


def active_rms(x, env_db, b, gate):
    mask = np.repeat(env_db > gate, b)
    mask = np.pad(mask, (0, max(0, x.shape[1] - len(mask))))[: x.shape[1]]
    sel = x[:, mask]
    return float(np.sqrt((sel ** 2).mean() + 1e-12)) if sel.size else 0.1


def short_term_peak_rms(x, win=0.1):
    """Loudest 100 ms, ignoring sub-bass: a 40 Hz bloom measures loud but sounds quiet."""
    x = highpass(x, 150)
    b = int(win * SR)
    m = x.shape[1] // b
    return float(np.sqrt((x[:, : m * b].reshape(2, m, b) ** 2).mean(axis=(0, 2))).max() + 1e-12)


def loudnorm(src, dst):
    common = f"I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11"
    log = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", src, "-af", f"loudnorm={common}:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", log, re.S).group(0))
    second = (f"loudnorm={common}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
              f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
              f":offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", second, "-ar", str(SR), dst], check=True)


def encoded_peak(path):
    log = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    return float(re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", log)[-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--voice", help="voice track to use instead of the cut's own audio")
    ap.add_argument("--cues", help="cues JSON (from a previous run) to use instead of detecting")
    args = ap.parse_args()

    base = os.path.splitext(args.out)[0]
    if args.cues:
        with open(args.cues) as f:
            c = json.load(f)
    else:
        c = cue_detect.detect(args.voice or args.video) if args.voice else cue_detect.detect(args.video)
        if args.voice:  # visuals come from the cut even when the voice does not
            scenes, ui = cue_detect.visual_events(args.video)
            c.update(scenes=scenes, ui=ui)
        with open(base + ".cues.json", "w") as f:
            json.dump(c, f, indent=2)
    print(f"cues: scenes={c['scenes']} ui={c['ui']} logo={c['logo']} sections={c['sections']}", file=sys.stderr)

    n = int(c["duration"] * SR)
    voice = load_audio(args.voice or args.video, n)
    env_db, b = envelope(voice)
    gate = env_db.max() - 30
    v_rms = active_rms(voice, env_db, b, gate)

    m = music.render(c)[:, :n]
    m = np.pad(m, ((0, 0), (0, n - m.shape[1])))
    m *= v_rms * db(c.get("music_under", MUSIC_UNDER)) / (np.sqrt((m ** 2).mean()) + 1e-12)
    talking = np.clip((env_db - gate) / 10, 0, 1)
    gain = db(-c.get("duck", DUCK) * talking)
    m *= np.interp(np.arange(n), np.arange(len(gain)) * b + b / 2, gain).astype(np.float32)

    s = sfx.render(c)[:, :n]
    s = np.pad(s, ((0, 0), (0, n - s.shape[1])))
    s *= v_rms * db(SFX_PEAK) / short_term_peak_rms(s)

    mix = soft_limit(voice + m + s)
    for name, x in (("voice", voice), ("music", m), ("sfx", s), ("premaster", mix)):
        wavfile.write(f"{base}.{name}.wav", SR, x.T.astype(np.float32))
    loudnorm(f"{base}.premaster.wav", f"{base}.mix.wav")
    # AAC can overshoot the peaks loudnorm left, by 2 dB on a dense mix. Measure
    # what was actually encoded and pull it back under the ceiling if it went over.
    gain = 0.0
    for _ in range(2):
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", args.video, "-i", f"{base}.mix.wav",
             "-map", "0:v", "-map", "1:a", "-c:v", "copy",
             "-af", f"alimiter=limit={db(TRUE_PEAK - 1):.3f}:attack=1:release=40:level=disabled,volume={gain}dB",
             "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", args.out],
            check=True)
        peak = encoded_peak(args.out)
        if peak <= ENCODED_CEILING:
            break
        gain -= peak - ENCODED_CEILING + 0.2
    os.remove(f"{base}.premaster.wav")
    print(args.out)


if __name__ == "__main__":
    main()
