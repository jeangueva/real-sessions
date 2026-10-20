import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { EASE_OUT } from "./motion";

/**
 * A list of questions that open one at a time.
 *
 * Ported from Great UI's accordion (https://great-ui.com, MIT-spirited custom
 * licence, by Saurabh Sharma — https://github.com/Saurabh-2607/GreatUI). The
 * shape is theirs: stacked cards on a tinted tray, a mark that turns as a row
 * opens, and height animated rather than snapped. Four things were changed
 * rather than copied, each for a reason worth writing down.
 *
 * **It is reachable.** The original rendered a bare `<button>` and a `<div>`.
 * A screen reader met a button with no state and a region with no name, which
 * is a list of questions that cannot be answered without sight. The trigger
 * now carries `aria-expanded` and `aria-controls`, and the panel is a region
 * labelled by its own question.
 *
 * **Clicking elsewhere does not close it.** The original listened on
 * `document` for `mousedown` and collapsed everything. That is dropdown
 * behaviour: on a page of questions it means an answer vanishes the moment
 * the reader reaches for anything else — a scrollbar, a link, their own
 * selection.
 *
 * **The answer is not a button.** It had an `onClick` that toggled the row
 * shut, so selecting a sentence to re-read it closed the sentence.
 *
 * **Colours come from the theme.** The original hard-coded `#fdf7f9` and a
 * parallel set of `dark:` classes. This product's palette is five themes deep
 * and every one of them is defined in tokens; a literal belongs to none of
 * them.
 *
 * What is kept unchanged: nothing opens on first paint. `defaultOpen` exists
 * but is not set here, because an answer already open is a question the reader
 * did not ask.
 */
export interface AccordionEntry {
  question: string;
  answer: string;
}

export function Accordion({
  entries,
  defaultOpen = null,
  className = "",
}: {
  entries: AccordionEntry[];
  /** Index of a row to start open. Null — the default — opens none. */
  defaultOpen?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const base = useId();
  const still = useReducedMotion();

  return (
    <div className={`w-full rounded-2xl bg-surface-sunken p-1.5 ${className}`}>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry, index) => {
          const isOpen = open === index;
          const panelId = `${base}-panel-${index}`;
          const triggerId = `${base}-trigger-${index}`;
          return (
            <div
              key={entry.question}
              className="overflow-hidden rounded-xl border border-line bg-surface-card"
            >
              <h3>
                <button
                  type="button"
                  id={triggerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-normal text-cream-bright transition-[background-color,transform] duration-150 ease-press hover:bg-surface-lift/60 active:scale-[0.99]"
                >
                  <span>{entry.question}</span>
                  {/* The mark turns rather than swapping, so the eye follows
                      one object instead of noticing two. */}
                  <motion.span
                    aria-hidden
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: still ? 0 : 0.2, ease: EASE_OUT }}
                    className="shrink-0 text-cream-faint"
                  >
                    {isOpen ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </motion.span>
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="answer"
                    initial={still ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={still ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: still ? 0 : 0.22, ease: EASE_OUT }}
                  >
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      className="px-5 pb-4 text-sm leading-relaxed text-cream-dim"
                    >
                      {entry.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
