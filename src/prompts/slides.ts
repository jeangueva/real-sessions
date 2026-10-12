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
