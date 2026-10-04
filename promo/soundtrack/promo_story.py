"""An Instagram story for the early-access code: what it gives, and how to use it.

    python promo_story.py es out/promo/early100-es.mp4
    python promo_story.py en out/promo/early100-en.mp4

10 s, 1080x1920, with music and sound, plus a still of the last frame next to
the video (.png). The "how" is shown, not only told: the promotion field from
the app, the code typing itself in, Apply, the confirmation.

Every string the field shows is the app's own (web/src/lib/i18n.ts and
locales/es.ts), so what somebody sees here is what they will see in Settings
-> Plan.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile

import music
import sfx
from dsp import SR, db, soft_limit
from mix import loudnorm

W, H, FPS, DUR = 1080, 1920, 30, 10.0
BG = (11, 11, 11)
INK = (242, 239, 230)
MUTED = (138, 135, 127)
CARD = (20, 20, 20)
LINE = (44, 43, 40)
OK = (155, 211, 165)
X0 = 84
CODE = "EARLY100"
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "fonts")

COPY = {
    "es": {
        "pill": "Acceso anticipado",
        "head": ["30 días del plan", "pagado, gratis."],
        "seats": "Solo 100 cupos",
        "how": "Cómo usarlo",
        "steps": ["Crea tu cuenta en getmockio.com", "Ve a Ajustes → Plan", "Escribe el código y dale Aplicar"],
        "ask": "¿Tienes un código de promoción?",
        "apply": "Aplicar",
        "done": "Código aplicado.",
        "tap": "Toca el enlace para entrar",
    },
    "en": {
        "pill": "Early access",
        "head": ["30 days of the", "paid plan, free."],
        "seats": "Only 100 spots",
        "how": "How to use it",
        "steps": ["Create your account at getmockio.com", "Go to Settings → Plan", "Type the code and tap Apply"],
        "ask": "Have a promotion code?",
        "apply": "Apply",
        "done": "Code applied.",
        "tap": "Tap the link to get in",
    },
}


def font(size, weight=700):
    return ImageFont.truetype(os.path.join(FONTS, f"Inter-{weight}.ttf"), size)


def layer(h, w=W):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def text_layer(text, size, weight=700, color=INK, tracking=0):
    """A line of text on its own transparent layer, with "→" drawn as a shape
    (the font subset has no arrow)."""
    f = font(size, weight)
    parts = text.split("→")
    arrow_w = int(size * 0.9)
    widths = [f.getlength(p) + tracking * len(p) for p in parts]
    total = int(sum(widths) + arrow_w * (len(parts) - 1)) + 8
    img = layer(int(size * 1.35), total)
    d = ImageDraw.Draw(img)
    x = 0
    for i, p in enumerate(parts):
        for ch in p:
            d.text((x, 0), ch, font=f, fill=color + (255,))
            x += f.getlength(ch) + tracking
        if i < len(parts) - 1:
            cy, a0, a1 = size * 0.62, x + size * 0.12, x + arrow_w - size * 0.12
            sw = max(3, size // 12)
            d.line([(a0, cy), (a1, cy)], fill=color + (255,), width=sw)
            d.line([(a1 - size * 0.24, cy - size * 0.22), (a1, cy), (a1 - size * 0.24, cy + size * 0.22)],
                   fill=color + (255,), width=sw, joint="curve")
            x += arrow_w
    return img


def rounded(w, h, r, fill=None, outline=None, width=2, dash=None, scale=3):
    """A rounded rectangle drawn at 3x and scaled down, so the corners are smooth."""
    big = layer(h * scale, w * scale)
    d = ImageDraw.Draw(big)
    box = [width * scale, width * scale, w * scale - width * scale, h * scale - width * scale]
    if fill:
        d.rounded_rectangle(box, r * scale, fill=fill + (255,))
    if outline and not dash:
        d.rounded_rectangle(box, r * scale, outline=outline + (255,), width=width * scale)
    if outline and dash:
        # A dashed coupon edge: draw the outline, then cut gaps along the straight sides.
        d.rounded_rectangle(box, r * scale, outline=outline + (255,), width=width * scale)
        gap, step = dash[1] * scale, (dash[0] + dash[1]) * scale
        clear = (0, 0, 0, 0) if not fill else fill + (255,)
        for x in range(int(r * scale + dash[0] * scale), int(w * scale - r * scale), step):
            d.rectangle([x, 0, x + gap, (width + 1) * scale * 2], fill=clear)
            d.rectangle([x, h * scale - (width + 1) * scale * 2, x + gap, h * scale], fill=clear)
        for y in range(int(r * scale + dash[0] * scale), int(h * scale - r * scale), step):
            d.rectangle([0, y, (width + 1) * scale * 2, y + gap], fill=clear)
            d.rectangle([w * scale - (width + 1) * scale * 2, y, w * scale, y + gap], fill=clear)
    return big.resize((w, h), Image.LANCZOS)


def check(size, color):
    big = layer(size * 3, size * 3)
    ImageDraw.Draw(big).line([(size * 0.5, size * 1.6), (size * 1.2, size * 2.3), (size * 2.5, size * 0.8)],
                             fill=color + (255,), width=int(size * 0.36), joint="curve")
    return big.resize((size, size), Image.LANCZOS)


def waves(t):
    """Three thin glowing curves drifting behind the coupon, as in the launch video."""
    y0, h = 560, 360
    xs = np.arange(W)[None, :]
    ys = np.arange(h)[:, None]
    out = np.zeros((h, W, 4), np.float32)
    for k, (col, amp, freq, speed, ph) in enumerate([
        ((95, 179, 166), 70, 1.6, 0.35, 0.0),
        ((154, 127, 209), 90, 1.2, -0.28, 1.7),
        ((201, 135, 158), 55, 2.1, 0.22, 3.1),
    ]):
        yc = h / 2 + amp * np.sin(2 * np.pi * (freq * xs / W) + ph + speed * t * 2 * np.pi * 0.25)
        a = np.exp(-((ys - yc) / 2.2) ** 2) * 0.55 + np.exp(-((ys - yc) / 9) ** 2) * 0.12
        out[..., :3] += a[..., None] * np.array(col, np.float32)
        out[..., 3] = np.maximum(out[..., 3], a)
    edge = np.clip(np.minimum(xs, W - xs) / 220, 0, 1)  # fade at the sides
    out[..., 3] *= edge * 0.55
    rgb = np.clip(out[..., :3] / np.maximum(out[..., 3:4] / 0.55, 1e-3), 0, 255)
    img = np.concatenate([rgb, out[..., 3:4] * 255], axis=2).astype(np.uint8)
    return Image.fromarray(img, "RGBA"), y0


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_back(x):
    c = 1.6
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def appear(t, at, dur=0.45):
    x = np.clip((t - at) / dur, 0, 1)
    return x, ease_out(x)


def build(lang):
    c = COPY[lang]
    L = {}
    L["mark"] = text_layer("mockio", 66, 700)
    pill_t = text_layer(c["pill"], 30, 600, INK)
    pill = rounded(pill_t.width + 44, 58, 29, fill=(30, 30, 29), outline=LINE, width=2)
    pill.alpha_composite(pill_t, (22, 10))
    L["pill"] = pill
    L["head"] = [text_layer(s, 92, 700) for s in c["head"]]
    coupon = rounded(W - 2 * X0, 200, 30, fill=(18, 18, 17), outline=(222, 219, 200), width=3, dash=(22, 14))
    code = text_layer(CODE, 128, 700, INK, tracking=8)
    coupon.alpha_composite(code, ((coupon.width - code.width) // 2, (200 - code.height) // 2 + 6))
    L["coupon"] = coupon
    L["seats"] = text_layer(c["seats"], 38, 600, MUTED)
    L["how"] = text_layer(c["how"], 44, 700)
    steps = []
    for i, s in enumerate(c["steps"]):
        num = rounded(56, 56, 28, fill=(30, 30, 29), outline=LINE, width=2)
        n = text_layer(str(i + 1), 30, 700)
        num.alpha_composite(n, ((56 - n.width) // 2 + 3, 10))
        txt = text_layer(s, 40, 500)
        row = layer(64, W - 2 * X0)
        row.alpha_composite(num, (0, 2))
        row.alpha_composite(txt, (80, 6))
        steps.append(row)
    L["steps"] = steps
    L["card"] = rounded(W - 2 * X0, 300, 28, fill=CARD, outline=LINE, width=2)
    L["ask"] = text_layer(c["ask"], 34, 600, MUTED)
    L["input"] = rounded(640, 104, 18, fill=(11, 11, 11), outline=(70, 68, 63), width=2)
    L["input_on"] = rounded(640, 104, 18, fill=(11, 11, 11), outline=(222, 219, 200), width=3)
    btn_t = text_layer(c["apply"], 36, 700, BG)
    L["btn"] = rounded(btn_t.width + 60, 104, 18, fill=INK)
    L["btn"].alpha_composite(btn_t, (30, (104 - btn_t.height) // 2 + 4))
    L["typed"] = [text_layer(CODE[:k], 50, 700, INK, tracking=4) for k in range(len(CODE) + 1)]
    done = layer(60, W - 2 * X0)
    done.alpha_composite(check(40, OK), (0, 8))
    done.alpha_composite(text_layer(c["done"], 36, 600, OK), (56, 4))
    L["done"] = done
    L["tap"] = text_layer(c["tap"] + " ↓", 36, 600, MUTED)
    return L


def paste(frame, img, x, y, alpha=1.0, dy=0.0, scale=1.0):
    if alpha <= 0:
        return
    if scale != 1.0:
        w, h = max(1, int(img.width * scale)), max(1, int(img.height * scale))
        img = img.resize((w, h), Image.BICUBIC)
        x += (img.width / scale - img.width) / 2
        y += (img.height / scale - img.height) / 2
    if alpha < 1:
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda v: int(v * alpha)))
    frame.alpha_composite(img, (int(round(x)), int(round(y + dy))))


# When each thing lands, in seconds.
T = {"mark": 0.15, "head0": 0.45, "head1": 0.65, "coupon": 1.2, "seats": 1.7, "how": 2.4,
     "step0": 2.7, "step1": 3.2, "step2": 3.7, "card": 4.1, "type": 4.5, "press": 5.75,
     "done": 6.15, "tap": 6.8, "glint1": 2.0, "glint2": 8.4}


def frame_at(t, L):
    f = Image.new("RGBA", (W, H), BG + (255,))
    wv, wy = waves(t)
    x, e = appear(t, 0.0, 1.2)
    paste(f, wv, 0, wy, alpha=e)

    for key, img, x0, y0 in [("mark", L["mark"], X0, 292)]:
        a, e = appear(t, T[key])
        paste(f, img, x0, y0, a, dy=24 * (1 - e))
    a, e = appear(t, T["mark"] + 0.15)
    paste(f, L["pill"], W - X0 - L["pill"].width, 300, a, dy=24 * (1 - e))
    for i in range(2):
        a, e = appear(t, T[f"head{i}"])
        paste(f, L["head"][i], X0, 410 + i * 108, a, dy=30 * (1 - e))

    # The coupon pops in with a little overshoot, and a light runs across it twice.
    x = np.clip((t - T["coupon"]) / 0.55, 0, 1)
    if x > 0:
        s = 0.86 + 0.14 * ease_back(x)
        paste(f, L["coupon"], X0, 660, min(1, x * 2.5), scale=s)
        for g in ("glint1", "glint2"):
            gx = (t - T[g]) / 0.7
            if 0 <= gx <= 1:
                band = layer(200, W - 2 * X0)
                arr = np.zeros((200, W - 2 * X0, 4), np.uint8)
                cx = -200 + gx * (W - 2 * X0 + 400)
                xs = np.arange(W - 2 * X0)[None, :] + np.arange(200)[:, None] * 0.35
                a_ = np.exp(-((xs - cx) / 60) ** 2) * 70
                arr[..., :3] = 255
                arr[..., 3] = a_.astype(np.uint8)
                band = Image.fromarray(arr, "RGBA")
                mask = L["coupon"].getchannel("A")
                band.putalpha(Image.fromarray(np.minimum(np.array(band.getchannel("A")), np.array(mask)), "L"))
                paste(f, band, X0, 660)
    a, e = appear(t, T["seats"])
    paste(f, L["seats"], X0, 880, a, dy=18 * (1 - e))

    a, e = appear(t, T["how"])
    paste(f, L["how"], X0, 990, a, dy=20 * (1 - e))
    for i in range(3):
        a, e = appear(t, T[f"step{i}"])
        paste(f, L["steps"][i], X0 - 30 * (1 - e), 1066 + i * 84, a)

    # The field from the app: the code types itself in, Apply is pressed, it is applied.
    a, e = appear(t, T["card"], 0.5)
    if a > 0:
        cy = 1330 + 30 * (1 - e)
        paste(f, L["card"], X0, cy, a)
        paste(f, L["ask"], X0 + 36, cy + 34, a)
        typing = t >= T["type"]
        paste(f, L["input_on"] if typing and t < T["done"] else L["input"], X0 + 36, cy + 96, a)
        k = int(np.clip((t - T["type"]) / 0.13, 0, len(CODE))) if typing else 0
        txt = L["typed"][k]
        paste(f, txt, X0 + 66, cy + 116, a)
        if typing and t < T["done"] and int(t * 2.4) % 2 == 0:  # caret
            ImageDraw.Draw(f).rectangle([X0 + 70 + txt.width, cy + 118, X0 + 74 + txt.width, cy + 180],
                                        fill=INK + (255,))
        pressed = T["press"] <= t < T["press"] + 0.18
        btn_x = X0 + 36 + 640 + 20
        paste(f, L["btn"], btn_x, cy + 96, a * (0.8 if pressed else 1.0), scale=0.94 if pressed else 1.0)
        da, de = appear(t, T["done"], 0.4)
        paste(f, L["done"], X0 + 36, cy + 222, da, dy=12 * (1 - de))

    a, e = appear(t, T["tap"])
    bob = 6 * np.sin(2 * np.pi * 0.9 * max(0, t - T["tap"]))
    paste(f, L["tap"], X0, 1690 + bob, a)
    return f.convert("RGB")


def soundtrack(path):
    cues = {
        "duration": DUR, "scenes": [], "ui": [], "logo": T["done"],
        "sections": {"turn": T["coupon"], "pulse": T["step0"], "resolve": T["done"]},
        "music_fade_in": 0.3,
        "sfx": [
            {"t": 0.12, "sound": "thump"},
            {"t": T["coupon"], "sound": "pop"},
            {"t": T["glint1"], "sound": "shimmer"},
            {"t": T["step0"], "sound": "tick"},
            {"t": T["step1"], "sound": "tick"},
            {"t": T["step2"], "sound": "pop"},
            {"t": T["type"], "sound": "counter"},      # the code typing in
            {"t": T["press"], "sound": "swish"},       # Apply
            {"t": T["done"], "sound": "bell"},
            {"t": T["done"] + 0.05, "sound": "shimmer"},
        ],
    }
    m = music.render(cues)
    s = sfx.render(cues)
    n = min(m.shape[1], s.shape[1])
    m = m[:, :n] / (np.sqrt((m ** 2).mean()) + 1e-9) * db(-20)
    s = s[:, :n] / (np.abs(s).max() + 1e-9) * db(-14)
    raw = path + ".raw.wav"
    wavfile.write(raw, SR, soft_limit(m + s).T.astype(np.float32))
    loudnorm(raw, path)
    os.remove(raw)


def main():
    lang, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    L = build(lang)
    audio = os.path.splitext(out)[0] + ".wav"
    soundtrack(audio)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", audio, "-c:v", "libx264", "-crf", "16", "-preset", "slow",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    last = None
    for i in range(int(DUR * FPS)):
        last = frame_at(i / FPS, L)
        enc.stdin.write(last.tobytes())
    enc.stdin.close()
    enc.wait()
    last.save(os.path.splitext(out)[0] + ".png")
    os.remove(audio)
    print(out)


if __name__ == "__main__":
    main()
