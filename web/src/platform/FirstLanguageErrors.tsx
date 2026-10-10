import { Languages } from "lucide-react";
import { Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { Evaluation } from "@/lib/evaluation";
import type { MessageKey } from "@/lib/i18n";

type Item = NonNullable<Evaluation["first_language_errors"]>[number];

const KIND: Record<Item["kind"], MessageKey> = {
  "false-friend": "l1.falseFriend",
  "literal-translation": "l1.literal",
  "word-order": "l1.order",
  tense: "l1.tense",
  preposition: "l1.preposition",
  article: "l1.article",
  other: "l1.other",
};

/**
 * The errors that come from thinking in your own language.
 *
 * The part of the report no other tool writes: not "grammar" in general,
 * but the false friend, the structure carried over word for word, the
 * preposition that is right in Spanish — named, explained in the reader's
 * language, with the version to say instead. These come back in every
 * answer until someone points at them once.
 */
export function FirstLanguageErrors({ items }: { items: Item[] }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <Panel className="p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent-text">
          <Languages className="h-4 w-4" />
        </span>
        {t("l1.title")}
      </h2>
      <p className="mt-1 text-sm text-cream-dim">{t("l1.hint")}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-2xl bg-surface-lift p-4 [overflow-wrap:anywhere]">
            <span className="rounded-full bg-surface-card px-2.5 py-0.5 text-xs font-semibold text-cream-dim">
              {t(KIND[item.kind])}
            </span>
            <p className="mt-2 text-sm text-cream-faint line-through decoration-step/60">{item.said}</p>
            <p className="text-sm font-semibold text-cream-bright">{item.fix}</p>
            <p className="mt-1.5 text-sm text-cream-dim">{item.why}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
