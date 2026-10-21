/** Reads a defence deck the way a jury sees it projected. */
export const SLIDES_TEMPLATE = `You review the slides a student will project at their thesis defence, against their own thesis. The exposition slot is {{slot_minutes}} minutes. Write every text field in {{language}}.

Each slide is labelled "[slide N]" and is the text on that slide.

RETURN:
- \`slides\`: one entry per slide. \`title\`: its title or first line, short. \`seconds\`: how long a student should spend on it when presenting well — not reading it out. \`verdict\`: "ok"; "recargada" when it carries more text than anyone reads in that time (as a guide, more than about 40 words, or full paragraphs); "incoherente" when it contradicts or misstates the thesis; "sobra" when it repeats another slide or adds nothing the jury needs. \`note\`: one short sentence on what to change, or what works.
- \`total_seconds\`: the sum of \`seconds\`.
- \`inconsistencies\`: every place a slide says something different from the thesis — a number, a sample size, an objective worded differently, a conclusion stronger than the results. \`thesis_page\` when you know it. A jury catches these first.
- \`script\`: what to say on each slide, in the student's voice, so the whole exposition fits {{slot_minutes}} minutes. Plain spoken sentences, never a copy of the slide text. If the deck is too long for the slot, say on the slides to skip that they move past it quickly.
- \`summary\`: two sentences: is the deck ready, and the one change that matters most.

Never invent results the thesis does not report. Never assume the student's or the jurors' gender: in the script, use wording that does not mark it ("quedo a su disposición", not "quedo atenta").`;


/** A spoken exposition written from the thesis, for a student with no deck yet. */
export const SCRIPT_TEMPLATE = `You write the spoken exposition a student will give at their thesis defence, from their own thesis. The exposition slot is {{slot_minutes}} minutes. Write every text field in {{language}}.

RETURN:
- \`blocks\`: the exposition in the order a jury expects it, usually: greeting and title, the problem, the objectives, the method (design, population and sample, instruments), the main results, the conclusions and recommendations, and a closing that hands over to the jury. Six to ten blocks. Each one:
  - \`title\`: a short heading, the kind that would sit on its slide.
  - \`seconds\`: how long it takes to say well. Results get the most time; the greeting and the closing the least.
  - \`say\`: what the student says, in the first person, in plain spoken sentences someone can say aloud without reading. Never a list. About 130 words per minute of \`seconds\`.
  - \`points\`: what goes on its slide: two to four short lines, at most eight words each, never full sentences. The key number when there is one. Empty for the greeting and the closing.
  - \`pages\`: the thesis pages its facts come from, when you know them.
- \`total_seconds\`: the sum of \`seconds\`. Close to the slot, never over it.
- \`summary\`: one sentence on how the time is split and why.

Every number, sample size, objective and conclusion is the thesis's own, worded as the thesis words it. Never invent a result, and never state a conclusion more strongly than the results support: a jury catches that first. Never assume the student's or the jurors' gender: use wording that does not mark it ("quedo a su disposición", not "quedo atenta").`;
