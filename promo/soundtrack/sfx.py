"""Sound design: what the screen does, you hear.

- a soft whoosh carries every scene change
- a felt tick when something lands on screen (a card, a bar, a number)
- a low swell under the turn ("she was not short of English")
- a riser into the logo, and a bell when it lands
- a quiet late-night room under all of it, so the voice is never in a vacuum
"""
import numpy as np

from dsp import SR, bandpass, db, fade, highpass, lowpass, pan, place, reverb, reverb_ir, seconds, shaped_noise


def whoosh(dur=0.9, lo=250, hi=3200, seed=0):
    k = 64
    x = np.linspace(0, 1, k)
    centers = lo * (hi / lo) ** np.sin(np.pi * np.clip(x / 0.65, 0, 1) / 2) * np.where(x > 0.65, (1 - (x - 0.65) / 0.35 * 0.55), 1)
    y = shaped_noise(dur, centers, width=0.45, seed=seed)
    t = seconds(y.shape[1]) / dur
    env = np.where(t < 0.65, (t / 0.65) ** 2.2, np.exp(-(t - 0.65) / 0.12))
    # sweep left to right
    lr = np.stack([np.cos((t) * np.pi / 2) * 0.6 + 0.4, np.sin((t) * np.pi / 2) * 0.6 + 0.4])
    return (y * env * lr).astype(np.float32)


def tick(pitch=1.0, seed=0):
    rng = np.random.default_rng(seed)
    n = int(0.18 * SR)
    t = seconds(n)
    f = 1250 * pitch
    body = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.028) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / 0.012)
    click = highpass(rng.standard_normal(n).astype(np.float32), 3000) * np.exp(-t / 0.003) * 0.3
    return pan(lowpass((body + click).astype(np.float32), 5000), rng.uniform(-0.15, 0.15))


def swell(dur=2.4):
    """Low cinematic bloom: a sub that blooms and a dark noise breath."""
    n = int(dur * SR)
    t = seconds(n)
    f = 41 + 8 * np.exp(-t / 0.4)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - np.exp(-t / 0.04)) * np.exp(-t / 0.9)
    breath = lowpass(np.random.default_rng(5).standard_normal(n).astype(np.float32), 300) * np.exp(-t / 0.6) * 0.5
    return pan((sub + breath).astype(np.float32))


def riser(dur=1.8):
    k = 64
    centers = 220 * (5200 / 220) ** (np.linspace(0, 1, k) ** 1.6)
    y = shaped_noise(dur, centers, width=0.35, seed=11)
    t = seconds(y.shape[1]) / dur
    env = t ** 2.5 * np.where(t > 0.96, np.clip((1 - t) / 0.04, 0, 1), 1)
    return (y * env).astype(np.float32)


def bell(midi=86):
    n = int(4.0 * SR)
    t = seconds(n)
    f0 = 440 * 2 ** ((midi - 69) / 12)
    y = np.zeros(n, np.float32)
    for ratio, amp, tau in ((1, 1, 2.2), (2.0, 0.45, 1.2), (2.76, 0.3, 0.8), (4.07, 0.18, 0.45), (5.43, 0.1, 0.3)):
        y += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / tau)
    y *= np.minimum(1, t / 0.002)
    return np.stack([y, np.roll(y, int(0.004 * SR))]) * 0.5


def room(dur, seed=21):
    """A quiet room at 10:40pm: low air, a faint hum, nothing that draws attention."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = seconds(n)
    brown = np.cumsum(rng.standard_normal((2, n)).astype(np.float32), axis=1)
    brown = highpass(brown, 30)
    brown /= np.abs(brown).max() + 1e-9
    air = bandpass(rng.standard_normal((2, n)).astype(np.float32), 2000, 7000) * 0.05
    hum = pan((np.sin(2 * np.pi * 60 * t) * 0.06 + np.sin(2 * np.pi * 120 * t) * 0.03).astype(np.float32))
    wobble = 1 + 0.25 * np.sin(2 * np.pi * 0.07 * t)
    return fade((lowpass(brown, 380) * 0.9 + air + hum) * wobble, 1.5, 1.5)


def render(cues):
    dur = cues["duration"]
    n = int(dur * SR)
    out = np.zeros((2, n), np.float32)
    dry = np.zeros((2, n), np.float32)
    for i, s in enumerate(cues["scenes"]):
        w = whoosh(0.9, seed=i)
        place(out, w * db(-4), s - 0.9 * 0.65)  # peak lands on the cut
    for i, u in enumerate(cues["ui"]):
        place(out, tick(pitch=1 + 0.06 * (i % 4), seed=i) * db(-10), u)
    turn = cues["sections"]["turn"]
    place(dry, swell() * db(-9), turn - 0.05)
    logo = cues["logo"]
    place(out, riser() * db(-8), logo - 1.8)
    place(out, bell(86) * db(-9), logo)
    place(out, bell(93) * db(-17), logo + 0.09)
    wet = reverb(out, reverb_ir(2.2, seed=3), 0.3)
    return wet + dry + room(dur) * db(-30)
