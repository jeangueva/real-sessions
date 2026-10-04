"""Sound design: what the screen does, you hear.

A palette rather than one sound per job: whoosh, swish, paper, pop, tick,
counter, thump, riser, bell and shimmer. No sound plays more than twice in a
cut (MAX_USES); the same whoosh on every cut stops being heard as design and
starts being heard as a loop.

Under all of it, a quiet late-night room, so the voice is never in a vacuum.
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


def swish(dur=0.38):
    """Shorter and brighter than the whoosh: a card sliding in, not a scene."""
    k = 48
    centers = 1400 * (7500 / 1400) ** np.linspace(0, 1, k) ** 0.7
    y = shaped_noise(dur, centers, width=0.35, seed=31)
    t = seconds(y.shape[1]) / dur
    env = np.where(t < 0.4, (t / 0.4) ** 1.5, np.exp(-(t - 0.4) / 0.1))
    lr = np.stack([1 - 0.5 * t, 0.5 + 0.5 * t])
    return (y * env * lr).astype(np.float32)


def paper(dur=0.55, seed=41):
    """A sheet slid across a desk: grainy mid-high noise that eases out."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = seconds(n) / dur
    grain = 0.6 + 0.4 * lowpass(rng.random(n).astype(np.float32), 40) * 2
    y = bandpass(rng.standard_normal(n).astype(np.float32), 1800, 6500) * grain
    env = np.minimum(1, t / 0.08) * (1 - t) ** 1.6
    return pan((y * env).astype(np.float32), 0.15)


def pop(pitch=1.0, seed=51):
    """A soft bubble pop: a quick upward chirp with a click on top."""
    rng = np.random.default_rng(seed)
    n = int(0.16 * SR)
    t = seconds(n)
    f = (520 + 900 * (1 - np.exp(-t / 0.012))) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
    click = highpass(rng.standard_normal(n).astype(np.float32), 4000) * np.exp(-t / 0.002) * 0.25
    return pan((body + click).astype(np.float32), rng.uniform(-0.2, 0.2))


def counter(dur=1.2, steps=9):
    """A number counting up: one gesture of quick, rising, softening blips."""
    n = int((dur + 0.2) * SR)
    out = np.zeros((2, n), np.float32)
    for i in range(steps):
        x = i / (steps - 1)
        at = dur * (1 - (1 - x) ** 1.8)  # slows down as it lands, like the number
        place(out, tick(pitch=0.9 + 0.5 * x, seed=60 + i) * (0.45 + 0.55 * x), at)
    return out


def shimmer(dur=1.6, seed=71):
    """High glints that scatter and fade, under the logo's bell."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros((2, n), np.float32)
    for _ in range(14):
        at = rng.uniform(0, dur * 0.6)
        f = rng.uniform(2600, 5200)
        m = int(0.4 * SR)
        tt = seconds(m)
        g = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.08) * np.minimum(1, tt / 0.003)
        place(out, pan(g.astype(np.float32), rng.uniform(-0.7, 0.7)) * rng.uniform(0.2, 0.5), at)
    t = seconds(n) / dur
    return out * (1 - t) ** 0.8


# name -> (make the sound, gain in dB, where it sits against its cue time)
SOUNDS = {
    "whoosh": (lambda: whoosh(0.9), -4, -0.9 * 0.65),   # peaks on the cut
    "swish": (swish, -7, -0.15),
    "paper": (paper, -6, -0.05),
    "pop": (pop, -8, 0.0),
    "tick": (tick, -10, 0.0),
    "counter": (counter, -12, 0.0),
    "thump": (swell, -9, -0.05),
    "riser": (riser, -8, -1.8),                          # ends on the cue
    "bell": (lambda: bell(86), -9, 0.0),
    "shimmer": (shimmer, -16, 0.08),
}
MAX_USES = 2
SCENE_ROTATION = ["whoosh", "swish", "paper"]
UI_ROTATION = ["tick", "pop"]


def plan(cues):
    """The sound for every moment, as [(time, name)].

    A cut that lists its own `sfx` gets exactly that, and is refused if any
    sound comes back more than MAX_USES times. Otherwise scene changes and
    landings rotate through the palette, and a moment whose sounds are all
    spent stays quiet rather than repeat one.
    """
    if "sfx" in cues:
        events = [(e["t"], e["sound"]) for e in cues["sfx"]]
        for name in {n for _, n in events}:
            uses = sum(1 for _, n in events if n == name)
            if uses > MAX_USES:
                raise ValueError(f"'{name}' plays {uses} times; the limit is {MAX_USES}")
        return events
    used, events = {}, []

    def take(t, rotation, k):
        for j in range(len(rotation)):
            name = rotation[(k + j) % len(rotation)]
            if used.get(name, 0) < MAX_USES:
                used[name] = used.get(name, 0) + 1
                events.append((t, name))
                return

    for i, t in enumerate(cues["scenes"]):
        take(t, SCENE_ROTATION, i)
    for i, t in enumerate(cues["ui"]):
        take(t, UI_ROTATION, i)
    events += [(cues["sections"]["turn"], "thump"), (cues["logo"], "riser"),
               (cues["logo"], "bell"), (cues["logo"], "shimmer")]
    return events


def render(cues):
    dur = cues["duration"]
    n = int(dur * SR)
    out = np.zeros((2, n), np.float32)
    dry = np.zeros((2, n), np.float32)
    for t, name in plan(cues):
        make, gain, offset = SOUNDS[name]
        # Sub-heavy sounds stay out of the reverb, which would only muddy them.
        place(dry if name == "thump" else out, make() * db(gain), t + offset)
    wet = reverb(out, reverb_ir(2.2, seed=3), 0.3)
    return wet + dry + room(dur) * db(-30)
