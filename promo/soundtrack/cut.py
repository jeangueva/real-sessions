"""Keep only some stretches of a cut, joined end to end.

    python cut.py in.mp4 out.mp4 9.1-13.4 18.0-27.3 30.9-end

Cut points belong in the pauses between lines. Each join gets a 15 ms audio
fade so it never clicks. Run mix.py on the result: it finds the new scene
changes itself, so the score is written for the shorter cut, not trimmed from
the long one.
"""
import subprocess
import sys

from cues import duration


def main():
    src, out, *spans = sys.argv[1:]
    total = duration(src)
    parts = []
    for s in spans:
        a, b = s.split("-")
        parts.append((float(a), total if b == "end" else float(b)))
    fv, fa, labels = [], [], []
    for i, (a, b) in enumerate(parts):
        d = b - a
        fv.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}]")
        fa.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,"
                  f"afade=t=in:d=0.015,afade=t=out:st={d - 0.015:.3f}:d=0.015[a{i}]")
        labels.append(f"[v{i}][a{i}]")
    graph = ";".join(fv + fa) + f";{''.join(labels)}concat=n={len(parts)}:v=1:a=1[v][a]"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", graph,
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "17", "-preset", "slow",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out], check=True)
    print(f"{out}: {sum(b - a for a, b in parts):.1f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
