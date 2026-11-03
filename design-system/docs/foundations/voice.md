---
title: Voice
group: Foundations
order: 4
summary: How the product speaks — Spanish first, tú, calm — and what it never says.
---

# Voice

The product speaks to a person who is nervous about a thesis. It is calm,
direct and specific, and it never raises its voice.

## The rules

1. **Spanish first.** The product speaks Spanish; the interface is written
   in it. The system's own code, comments and contracts are in English, and
   the words a person reads are in Spanish.
2. **Tú, not usted and never vos.** "Sube tu tesis", not "Suba su tesis"
   and not "Subí tu tesis". The only exception is the simulated jury, which
   speaks as an institution would.
3. **Sentence case.** "Ensayar mi sustentación", not "Ensayar Mi
   Sustentación".
4. **An action starts with a verb.** "Ver mi acta", not "Consultar el
   acta". The label says what happens, not what it is called.
5. **No exclamation marks.** Ever. The product is not excited about your
   thesis.
6. **Gender-neutral.** "Ensaya con el panel", not "Ensaya con tu panel" on
   one side and a gendered word on the other.
7. **The outcome, not the mechanism.** "Ver mi informe", not "Enviar". The
   person cares about the report.
8. **Say the price when the price is the obstacle.** "Sube tu tesis gratis"
   is better than a button that says "Enviar" and a line that says what it
   costs.

## The two voices

| Voice | Where | How it looks |
| --- | --- | --- |
| The product's | Titles, ledes, paragraphs, buttons, hints | The sentence above |
| The instrument's | Labels, tabs, chip, the `::` lines | Mono, uppercase, a little tracking, two colons in front |

The instrument voice names things — `::CÓMO FUNCIONA`, `::CASOS` — and
never says anything else. A label that explains itself is a paragraph in
the wrong place.

## What is never said

- **That the person was wrong.** Nothing in this product marks a person
  wrong. `step` is the next thing to work on, and `grow` is what got
  better. An "error" in a contract is a request that failed, not a person.
- **A congratulation nobody asked for.** A success notice for something the
  person did not ask about is noise.
- **A question the page does not answer.** A lede may end in a question
  when the page answers it further down.

## Where the copy comes from

Every example in a contract is **the product's own copy** — a string the
product shows, quoted from its source (`web/src/lib/thesis-copy.ts`,
`web/src/lib/locales/es.ts`) — or the default the system itself ships, like
the alt a component renders. None is invented, and `test/copy.test.ts` fails
when one is a string no source can produce.

The same rule holds for the strings a component writes itself: they are props
with a Spanish default, and the contract's `i18n.strings` lists every one
of them.

## The limits

Each component's contract carries its own limits — a label is 1–3 words, a
chip is 28 characters at most, a lede is two sentences. They are part of the
promise, not a suggestion.
