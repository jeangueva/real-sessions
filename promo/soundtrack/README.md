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

## Instagram story cut

A shorter version (26 s in English, 31 s in Spanish) with the same voice and
scenes. It keeps the lines the story cannot be followed without, and drops the
ones it can:

| Kept | Why it cannot go |
| --- | --- |
| Three months ago, Daniela got an email from a company in Rotterdam. | Who she is. Without it every "she" after points at nobody |
| The interview was in English, out loud, with somebody on the other side. | The problem |
| Six years reading and writing English. She had never spoken it for ten minutes straight. | Why it is a problem, and what "it" is in the next line |
| She said it here, a Tuesday night, twelve times. | What she did, over the practice screen |
| But at the end, somebody told her exactly where she got stuck. | What Mockio gave her |
| The last time, she did not. Mockio. | The result, and the name |

Dropped: "she read it four times", "she was not short of English…" (it
restates the line before it as an aphorism) and "nobody interrupted her".

A first story cut kept the aphorism and dropped the setup, and nobody could
tell who "she" was or what "it" meant. Cut for comprehension first and length
second.

```sh
python cut.py introducing-mockio-en.mp4 out/story/raw-en.mp4 0-4.9 9.1-17.6 22.5-27.3 30.9-end
python cut.py introducing-mockio-es.mp4 out/story/raw-es.mp4 0-5.3 9.5-20.5 25.5-30.8 35.0-44.9
```

Every cut point sits in a pause between lines. On the short cut the music's
sections follow its own scenes: write the cues, set `sections` to the first cut
(turn), the second cut (pulse) and the logo, add `"music_fade_in": 0.4` so the
music is there from the first frame, and run `mix.py` with `--cues`.

The text stays clear of the top 250 px and the bottom 340 px, which Instagram
covers with the profile bar and the reply field.

## Story, direct script (current)

The story that ships: a new script, recorded in Google AI Studio with a Gemini
voice, over stock footage and the product screens. About 20 s.

> ¿Tienes una entrevista de trabajo en inglés? Practícala antes, en voz alta,
> con Mockio. Te pregunta según tu puesto y la etapa del proceso, y hasta según
> la empresa a la que postulas. Al final ves qué mejorar y cómo vas avanzando.
> Empieza gratis en getmockio.com.

"Empieza gratis" rather than "pruébalo gratis": the company-specific interview
is a paid feature (`targetCompany`), and the line should not read as if the
free plan had it.

Each shot sits on the words it shows (`edl/story2-*.json`): a real interview
on the question, someone practising at a laptop on "practícala", the
interviewer, the posting, the report, the progress bars, the logo on the URL.
The voice is padded so the logo holds after the last word.

```sh
ffmpeg -i voice-es.wav -af apad=whole_dur=20.2 -ar 48000 -ac 2 out/media/voice-es-padded.wav
python broll.py edl/story2-es.json out/media/voice-es-padded.wav out/story/broll2-es.mp4 --media out/media
python mix.py out/story/broll2-es.mp4 out/story/mockio-story-es.mp4 \
  --voice out/media/voice-es-padded.wav --cues cues/story2-es.json
```

The cues for this cut take the scene changes from the edit list rather than
detecting them (two stock shots in a row have no dark frame between them).

**On-screen text.** The two stock shots carry the hook as text, line by line on
the words: "¿Entrevista de trabajo en inglés?", then "Practícala antes. / En
voz alta. / Con Mockio." Inter, the face of the product screens (fetched from
npm `@fontsource/inter` into `out/fonts/` as TTF; OFL licence). On the laptop
shot the text sits in the dark band of the frame, above her head, never on a
face.

**Sounds.** Each moment has its own sound and none plays more than twice
(`sfx.MAX_USES`): a thump on the opening question, a whoosh into practising, a
pop on "Con Mockio", a swish to the interviewer, paper as the posting lands, a
whoosh to the report, a counter while the score climbs, a swish to the bars, a
pop as the last bar lands, then riser, bell and shimmer on the logo. The plan
is in the cues (`sfx`) and `sfx.plan` refuses one that repeats a sound a third
time.

**Music.** A story is heard on a phone speaker, so the score sits about 9 dB
under the voice instead of 13 (`music_under: -6`, `duck: 4` in the cues).

Stock footage, all from Pexels (free licence, no attribution required):
7644024 (the interview), 9198832 (practising at a laptop). Also on hand and
unused: 7844862, 8513143, 8555732.

## Early-access code story

`promo_story.py` draws a 10 s story for the `EARLY100` code (30 days of the
paid plan, 100 seats, as set in `REALSESSIONS_PROMO_CODES`) and a still of its
last frame:

```sh
python promo_story.py es out/promo/early100-es.mp4   # also writes early100-es.png
python promo_story.py en out/promo/early100-en.mp4
```

The "how" is shown, not only told: the promotion field from Settings → Plan,
with the app's own strings, the code typing itself in, Apply pressed, "Código
aplicado." The bottom of the frame is left clear for the link sticker.
