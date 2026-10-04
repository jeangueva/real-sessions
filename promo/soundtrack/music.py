"""The score: felt piano over a warm pad in D major, 72 BPM.

It follows the story the cut tells. Piano and pad alone for the setup, a low
bass enters on the turn ("she was not short of English"), a soft pulse carries
the twelve attempts, and everything resolves on the logo with a long tail.
"""
import numpy as np
from scipy import signal

from dsp import SR, db, fade, lowpass, midi_hz, pan, place, reverb, reverb_ir, seconds, highpass

BPM = 72
BEAT = 60 / BPM
BAR = 4 * BEAT

# (bass, pad voicing, arpeggio tones) — Bm9, Gmaj7, D(add9), A(add9)
CHORDS = [
    (47, [62, 66, 69, 73], [66, 69, 73, 74, 78]),
    (43, [62, 66, 71, 67], [67, 71, 74, 78, 79]),
    (50, [62, 66, 69, 76], [66, 69, 74, 76, 78]),
    (45, [64, 69, 71, 73], [64, 69, 71, 73, 76]),
]
RESOLVE = (38, [57, 66, 69, 73, 76], [74, 78, 81, 85, 86])  # Dmaj9


def piano(midi, dur, vel, rng):
    f0 = midi_hz(midi)
    n = int((dur + 3.0) * SR)
    t = seconds(n)
    y = np.zeros(n, np.float32)
    base_tau = 0.6 + 2.8 * (261.6 / f0) ** 0.7
    for k in range(1, 11):
        fk = k * f0 * np.sqrt(1 + 0.0004 * k * k)
        if fk > 9000:
            break
        amp = (1 / k ** 1.4) * np.exp(-(k - 1) * (0.55 - 0.3 * vel))
        tau = base_tau / (1 + 0.5 * (k - 1))
        ph = rng.random() * 2 * np.pi
        y += amp * np.sin(2 * np.pi * fk * t + ph) * np.exp(-t / tau)
        if k == 1:  # second string, slightly detuned, for the slow beating of a real piano
            y += 0.5 * amp * np.sin(2 * np.pi * fk * 1.0009 * t) * np.exp(-t / tau)
    y *= np.minimum(1, t / 0.004)
    off = int(dur * SR)
    y[off:] *= np.exp(-(t[off:] - dur) / 0.35)  # damper
    hammer = lowpass(rng.standard_normal(int(0.012 * SR)).astype(np.float32), 1800) * 0.04
    y[: len(hammer)] += hammer
    return lowpass(y * vel, 2600)  # felt


def pad_voice(midi, dur, rng):
    n = int((dur + 2.0) * SR)
    t = seconds(n)
    voices = []
    for cents, p in ((-7, -0.6), (0, 0.0), (7, 0.6)):
        f = midi_hz(midi) * 2 ** (cents / 1200)
        saw = signal.sawtooth(2 * np.pi * f * t + rng.random() * 6.28).astype(np.float32)
        voices.append(pan(saw, p))
    y = sum(voices) / 3
    attack, release = 1.4, 1.8
    env = np.minimum(1, t / attack) * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    lfo = 1 + 0.12 * np.sin(2 * np.pi * 0.17 * t + rng.random() * 6.28)
    return lowpass(y * env * lfo, 900, order=2)


def sub(midi, dur):
    n = int((dur + 0.8) * SR)
    t = seconds(n)
    f = midi_hz(midi)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.25) * np.where(t > dur, np.exp(-(t - dur) / 0.2), 1)
    return pan((y * env).astype(np.float32))


def kick():
    t = seconds(int(0.5 * SR))
    f = 46 + 60 * np.exp(-t / 0.035)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    return pan(y.astype(np.float32))


def shaker(rng, accent):
    n = int(0.09 * SR)
    t = seconds(n)
    y = highpass(rng.standard_normal(n).astype(np.float32), 6500)
    y *= np.minimum(1, t / 0.006) * np.exp(-t / 0.035) * accent
    return pan(y, rng.uniform(-0.3, 0.3))


def render(cues, seed=3):
    rng = np.random.default_rng(seed)
    dur = cues["duration"]
    sec = cues["sections"]
    turn, pulse, resolve = sec["turn"], sec["pulse"], sec["resolve"]
    n = int((dur + 0.5) * SR)
    pno, pad, low, perc = (np.zeros((2, n), np.float32) for _ in range(4))

    bar_i = 0
    t0 = 0.0
    while t0 < resolve - 0.05:
        bass, voicing, arp = CHORDS[bar_i % len(CHORDS)]
        bar_end = min(t0 + BAR, resolve)
        length = bar_end - t0
        for m in voicing:
            place(pad, pad_voice(m, length, rng), t0)
        if t0 >= turn - 0.01 or bar_end > turn:
            start = max(t0, turn)
            place(low, sub(bass - 12 if bass > 40 else bass, bar_end - start), start)
        # Piano: sparse in the setup, quarters after the turn, eighths during the practice.
        step = BEAT * (2 if t0 < turn else 1 if t0 < pulse else 0.5)
        pos = t0
        j = 0
        while pos < bar_end - 0.05:
            if pos < resolve - BEAT * 0.5:  # leave a breath before the logo
                note = arp[(j * 2 + bar_i) % len(arp)] if step < BEAT else arp[j % len(arp)]
                vel = rng.uniform(0.45, 0.62) * (1.0 if j % 2 == 0 else 0.8)
                jitter = rng.normal(0, 0.008)
                place(pno, pan(piano(note, step * 1.6, vel, rng), rng.uniform(-0.25, 0.25)), pos + jitter)
                if j == 0 and t0 >= turn:  # left-hand octave on the downbeat
                    place(pno, pan(piano(bass + 12, BAR * 0.9, 0.42, rng), -0.2), pos)
            pos += step
            j += 1
        # Pulse: soft kick on 1 and 3, a shaker on the eighths.
        if t0 + BAR > pulse:
            b = 0
            while t0 + b * BEAT / 2 < bar_end - 0.02:
                tt = t0 + b * BEAT / 2
                if pulse <= tt < resolve - BEAT:
                    if b % 4 == 0:
                        place(perc, kick() * 0.9, tt)
                    place(perc, shaker(rng, 0.9 if b % 2 else 0.5), tt + 0.012)
                b += 1
        t0 += BAR
        bar_i += 1

    # The resolve: a long D major chord, rolled on the piano, the pad opening up.
    bass, voicing, arp = RESOLVE
    tail = dur - resolve + 0.4
    for m in voicing:
        place(pad, pad_voice(m, tail, rng) * 1.15, resolve - 0.2)
    place(low, sub(bass, tail) * 1.1, resolve)
    for i, m in enumerate(sorted(voicing + [bass + 12])):
        place(pno, pan(piano(m, tail, 0.55, rng), -0.3 + 0.1 * i), resolve + i * 0.045)
    for i, m in enumerate(arp):  # a slow high sparkle
        place(pno, pan(piano(m, 1.2, 0.3, rng), 0.4 - 0.2 * i), resolve + 0.9 + i * BEAT * 0.5)

    ir = reverb_ir(3.2)
    mix = (reverb(pno, ir, 0.38) * db(-3)
           + reverb(pad, ir, 0.45) * db(-17)
           + low * db(-14)
           + reverb(perc, ir, 0.12) * db(-15))
    mix = mix[:, : int(dur * SR)]
    return fade(mix, fin=cues.get("music_fade_in", 2.0), fout=1.2)
