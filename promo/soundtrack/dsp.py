"""Small synthesis toolkit: everything is float32 numpy, 48 kHz, stereo as (2, n)."""
import numpy as np
from scipy import signal

SR = 48000


def seconds(n):
    return np.arange(n, dtype=np.float32) / SR


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def db(x):
    return 10 ** (x / 20)


def _sos(kind, fc, order=2):
    return signal.butter(order, fc, btype=kind, fs=SR, output="sos")


def lowpass(x, fc, order=2):
    return signal.sosfilt(_sos("low", fc, order), x, axis=-1).astype(np.float32)


def highpass(x, fc, order=2):
    return signal.sosfilt(_sos("high", fc, order), x, axis=-1).astype(np.float32)


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", [lo, hi], order), x, axis=-1).astype(np.float32)


def pan(mono, p=0.0):
    """Equal-power pan, p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)]).astype(np.float32)


def place(track, clip, start):
    """Add a (2, n) clip into a (2, N) track at `start` seconds, clipping at the edges."""
    i = int(round(start * SR))
    if i < 0:
        clip, i = clip[:, -i:], 0
    j = min(track.shape[1], i + clip.shape[1])
    if j > i:
        track[:, i:j] += clip[:, : j - i]


def fade(x, fin=0.0, fout=0.0):
    n = x.shape[-1]
    g = np.ones(n, np.float32)
    a, b = int(fin * SR), int(fout * SR)
    if a:
        g[:a] = np.linspace(0, 1, a) ** 2
    if b:
        g[n - b:] *= np.linspace(1, 0, b) ** 2
    return x * g


def reverb_ir(rt60=2.8, predelay=0.02, seed=7):
    """Stereo plate-ish impulse response: decorrelated noise, darker as it decays."""
    rng = np.random.default_rng(seed)
    n = int((rt60 + predelay) * SR)
    t = seconds(n)
    ir = rng.standard_normal((2, n)).astype(np.float32) * np.exp(-6.9 * t / rt60)
    # Air absorption: crossfade from bright to dark over the tail.
    dark = lowpass(ir, 2500)
    mix = np.clip(t / (rt60 * 0.5), 0, 1)
    ir = ir * (1 - mix) + dark * mix
    ir[:, : int(predelay * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


def reverb(x, ir, wet=0.3):
    tail = np.stack([signal.fftconvolve(x[c], ir[c])[: x.shape[1]] for c in range(2)])
    return (x * (1 - wet) + tail.astype(np.float32) * wet * 1.6).astype(np.float32)


def shaped_noise(dur, centers, width=0.5, seed=0):
    """Noise whose spectrum is a log-gaussian band following `centers` (Hz per frame).

    Done in the STFT domain so the band can glide smoothly — the core of every
    whoosh and riser here.
    """
    rng = np.random.default_rng(seed)
    nfft, hop = 2048, 256
    frames = int(dur * SR / hop) + 4
    freqs = np.fft.rfftfreq(nfft, 1 / SR)[:, None]
    fc = np.interp(np.linspace(0, 1, frames), np.linspace(0, 1, len(centers)), np.log(centers))[None, :]
    mag = np.exp(-0.5 * ((np.log(np.maximum(freqs, 20)) - fc) / width) ** 2)
    out = []
    for _ in range(2):
        ph = np.exp(2j * np.pi * rng.random(mag.shape))
        _, y = signal.istft(mag * ph, fs=SR, nperseg=nfft, noverlap=nfft - hop)
        out.append(y[: int(dur * SR)])
    y = np.stack(out).astype(np.float32)
    return y / (np.abs(y).max() + 1e-9)


def soft_limit(x, ceiling=0.95):
    return (np.tanh(x / ceiling) * ceiling).astype(np.float32)
