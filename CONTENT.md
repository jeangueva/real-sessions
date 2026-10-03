# How Mockio talks

Mockio is used by someone preparing for a job interview in a language that is
not their first, usually alone, usually nervous, often on a phone, sometimes
the night before the real thing. Every sentence in this product is read in
that state.

That one fact decides everything below. These are not style preferences; they
are what works for a reader who is already using most of their attention on
something else.

Grounded in [Mailchimp's voice and tone guide][mc] (tone follows the reader's
state; clarity beats entertainment), the GOV.UK content standards (plain
language, active voice, say the thing) and Nielsen Norman's error message
research. Where those disagree with the reader described above, the reader
wins.

[mc]: https://styleguide.mailchimp.com/voice-and-tone/

## The voice does not change. The tone does.

The voice is steady, plain and on their side — a competent person sitting
beside them, not a brand. That never changes.

The tone moves with what just happened:

| What the reader just did | How we sound |
| --- | --- |
| Finished an interview | Direct about the result. No congratulation they did not earn, no softening of what to fix. |
| Hit a wall we built (a paywall, a limit) | Matter of fact. Say what it costs and move on. Never wheedle. |
| Hit a wall we did not mean to build (an error) | Take the blame, say what to do next, get out of the way. |
| Is about to spend money | Flat and exact. Numbers, dates, what will be charged and when. No adjectives. |
| Is waiting | Say what is happening. Never a spinner with no sentence. |

## Rules

**Say what happened, then what to do.** An error that does not end in a next
step is a dead end. "Session not found." is a dead end. "That interview is no
longer open — start a new one." is not.

**Never use our words for our machinery.** The reader does not have an
"evaluator", a "reconciliation" or a "card token". They have an interview, a
payment and a card. If a sentence contains a word that only exists inside this
codebase, it is not finished.

**Take the blame.** "We could not read that file" rather than "invalid file".
The reader did nothing wrong, and even when they did, saying so costs us more
than it buys.

**No exclamation marks, no jokes in the way.** Mailchimp's rule and it is the
right one: forced humour is worse than none. Somebody who just got 54% is not
in the mood, and somebody whose card was declined is less so.

**Second person, active voice, present tense.** "You are on the free plan",
not "the free plan is currently active for this account".

**Numbers over adjectives.** "Five practices a week" beats "plenty of
practice". "S/ 287 a year, S/ 23.92 a month" beats "great value".

**Headings are sentences, not labels.** "Where you are getting better" says
something. "Progress" is a filing cabinet.

**The interface speaks Spanish the way Lima speaks it.** Tuteo, never voseo —
there is a test that enforces this. No Iberian Spanish ("vale", "ordenador").

## Before and after, from this codebase

| Was | Is |
| --- | --- |
| `Internal error.` | `Something broke on our side. Try again — nothing you did caused this.` |
| `Could not reconcile.` | `We could not check your payment just now. Your access has not changed.` |
| `Could not synthesize speech.` | `The voice did not come through. The interview continues in text.` |
| `The evaluator returned an unusable result.` | `We could not write your report. Your interview is saved — try again in a moment.` |
| `The interviewer declined to continue.` | `The interviewer stopped there. Start a new interview when you are ready.` |
| `Session not found or expired.` | `That interview is no longer open. Start a new one.` |
| `cardTokenId is required.` | `Fill in the card details first.` |
| `Already decided by someone else.` | `Another reviewer already answered this one.` |

## What is enforced, and what is not

A test refuses any user-facing error that contains a developer identifier —
`cardTokenId`, `externalReference`, anything in camelCase. That is the one
rule a machine can check.

Everything else on this page is checked by reading. The question to ask of any
new sentence: **would I say this out loud, in these words, to someone sitting
next to me who is nervous?** If not, it is not finished.
