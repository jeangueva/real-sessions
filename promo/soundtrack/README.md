# Launch video soundtrack

Puts a score and sound design under a rendered cut of the launch video, so the
narrator is not talking into silence. Nothing is licensed or downloaded: the
music and every effect are synthesised here, so there is no rights question
when the video goes on Instagram, TikTok or YouTube.

```sh
pip install -r requirements.txt   # needs ffmpeg on PATH
python mix.py introducing-mockio-es.mp4 out/introducing-mockio-es.mp4
```

The cut can be re-rendered with another voice or other timing and run through
again with no edits: the script reads where things happen from the video
itself.

## What it reads from the cut

`cues.py` finds:

- **lines**: where the voice speaks (silence detection)
- **scenes**: where one scene gives way to the next (the screen empties)
- **ui**: where something lands on screen after a still moment (a card, a bar, a number)
- **logo**: the first thing to land in the last scene

It writes them to `out/<name>.cues.json`. If one is wrong, fix it there and
run again with `--cues out/<name>.cues.json`.

## What you hear

| Where | Music (`music.py`) | Sound (`sfx.py`) |
| --- | --- | --- |
| Setup (Daniela, the email, the posting) | Felt piano, sparse, over a warm pad. D major, 72 BPM | A quiet room at night under everything |
| The turn ("she was not short of English") | Low bass comes in, piano on every beat | A low bloom |
| The practice ("Attempt 12" onwards) | A soft pulse: kick on 1 and 3, shaker on the eighths | A tick each time a bar, card or score lands |
| The logo | Everything resolves on a long D major chord | A riser into it, a bell when it lands |
| Every scene change | | A whoosh that peaks on the cut |

## Levels

Set at the top of `mix.py`, measured against the voice while it speaks:

- music sits 9 dB under the voice between lines, and dips another 5 dB while
  somebody talks (≈14 dB under the voice), starting 80 ms before each word
- effects peak at the logo, 5.5 dB under the voice; whooshes sit around 8 dB under
- the master is normalised to −14 LUFS, −2 dBTP: what the social platforms
  normalise to, so it is not turned down or up on upload

Stems (`voice`, `music`, `sfx`) are written next to the output for anyone who
wants to finish the mix in an editor.
