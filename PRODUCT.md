# Product

<!-- impeccable:product-schema 1 -->

> Written by Impeccable `init` without a live interview. Every fact below is
> taken from the repository (README.md, LAUNCH.md, CONTENT.md,
> web/src/legal/content.ts, web/src/components/DefenseLanding.tsx,
> web/src/design-system/README.md) or from the founder's brief. Lines marked
> **[inferred]** are reasonable readings of that evidence that nobody has
> confirmed yet; correct them rather than building on them.

## Platform

web

## Users

- **Primary: university students in Peru (and, by extension, Latin America)
  preparing to defend a thesis** (sustentación de tesis) in front of a jury of
  three: presidente, metodólogo, especialista. They are under real pressure,
  often days or hours away from the date, usually alone, frequently on a phone.
- **Secondary: graduates and early-career professionals rehearsing job
  interviews**, including interviews in English, against simulated hiring
  managers from real companies (the `/entrevistas` landing and the practice
  area of the app).
- **People around the student:** a thesis advisor (asesor) who can see shared
  progress, classmates joining a group defence from a link, someone paying for
  a student's pack through a gift link, affiliates, and institutions.
- **[inferred]** Most sessions happen at night or in a quiet room before the
  real date; the reader is anxious and reads every sentence in that state.

## Product Purpose

Mockio lets a student rehearse the moment before it happens. A jury that has
read the student's own thesis (up to 300 pages, scanned or not) asks
questions by voice, follows up on what was just answered, deliberates and
leaves an acta graded on the country's scale (0 to 20 in Peru). Before any
rehearsal, a free diagnosis reads the thesis like a jury would: weak points by
severity, the page of each, and the question that will come.

Success is a student who walks into the real defence having already heard the
hard questions, with an answer ready for each.

## Positioning

Every question cites a page of the student's own thesis, not "a thesis in
general", and every follow-up comes from the answer just given. The panel can
be seated as the student's real jury (names and habits typed in), and adjusts
depth, exposition time and grading severity to the degree.

## Operating Context

- Upload a thesis (PDF, Word, or photos of pages) and slides; read the
  diagnosis; rehearse (Ensayar) with a timed exposition and a three-person
  jury; read the acta and feedback; review weak answers (Repaso); log real
  observations from the advisor; prepare for the date (countdown, warm-up on
  the day).
- Group defence calls joined from a link, without an account.
- Interview practice: setup (company, role, level, interviewer temperament),
  live interview with coaching notes, a report with measured metrics (words
  per minute, filler rate, thinking time, vocabulary range), progress over
  time, an applications tracker.
- Payments in Peru through Mercado Pago; one-off packs (Sustentación,
  Intensivo), no subscription required for the thesis product.

## Capabilities and Constraints

- **It is a simulation, never a promise.** Juries and interviewers are
  fictional characters played by a language model. Their questions, opinions
  and grades are generated and cannot be treated as a real defence, a real
  interview or a real evaluation (legal terms, `web/src/legal/content.ts`).
  No surface may imply a guaranteed grade, degree or job.
- Mockio does not write the thesis and does not feed answers during the real
  defence.
- Voice in and out (Deepgram when configured, browser speech otherwise);
  typing is always a first-class path.
- Spanish (Peru) first, with English and Portuguese, plus Arabic script
  support in the type stack.
- Dark and light themes from the same tokens; the code currently defaults to
  light (`web/src/lib/theme.ts`).

## Brand Commitments

- Name: **Mockio**. Domain getmockio.com.
- Voice (CONTENT.md): steady, plain and on the student's side, like a
  competent person sitting beside them. Tone follows the reader's state.
- Spanish the way Lima speaks it: **tú**, never vos, never Iberian forms
  (enforced by a test).
- **No exclamation marks**, no jokes in the way, no congratulation that was
  not earned.
- Second person, active voice, present tense. Numbers over adjectives.
  Headings are sentences, not labels.
- Errors take the blame and end in a next step. Never expose internal words
  ("evaluator", "token") to the reader.
- Nothing marks a person wrong in red: the meaning colours are "the way
  forward", "what improved" and "what to work on next".

## Evidence on Hand

- Real product copy and example diagnosis findings on the landing
  (`DefenseLanding.tsx`), sample report fallbacks, dev fixtures for worst-case
  data (`web/src/lib/worst-case.ts`).
- Legal pages in es / en / pt.
- **Absent, must not be fabricated:** testimonials, university partnerships,
  pass rates, user counts, press, or any claim that rehearsing raises a grade.

## Product Principles

1. **Calm under pressure.** Every screen is read by someone nervous; nothing
   competes with the sentence they need now.
2. **Specific beats generic.** Page numbers, real scales, real costs.
3. **Honest simulation.** Say what it is; never promise the outcome.
4. **One way forward per screen.** The student should always know the next
   step without choosing among equals.
5. **Typing and voice are equals.** No path depends on a microphone.

## Accessibility & Inclusion

- WCAG AA contrast in both themes (token alpha steps are set by contrast).
- Focus restyled, never removed; reduced motion honoured in CSS and Framer
  Motion.
- Phone-first layouts with real touch targets; inputs never below 16px on
  touch devices.
