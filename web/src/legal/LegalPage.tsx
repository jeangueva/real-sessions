import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLocale, useT } from "@/hooks/useLocale";
import {
  draftNotice,
  isDraft,
  privacyFor,
  termsFor,
  updatedLabel,
  legalLocale,
  type LegalDocument,
} from "./content";

/**
 * The terms and the privacy policy.
 *
 * One component for both, because they are the same page with different words
 * — and because the draft guard below has to be impossible to have on one and
 * not the other.
 *
 * These follow the interface language rather than being fixed to one, since
 * the whole product does and a policy in a language the reader does not have
 * is a policy nobody read. The English text is the one that governs, which the
 * terms say in their own governing-law section.
 */

function Body({ document: doc }: { document: LegalDocument }) {
  const { locale } = useLocale();

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-title font-normal text-cream-bright">{doc.title}</h1>
        <p className="text-sm leading-relaxed text-cream-dim">{doc.intro}</p>
        <p className="text-xs text-cream-faint">
          {updatedLabel(legalLocale(locale))}: {doc.updated}
        </p>
      </header>

      {doc.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-cream-bright">{section.heading}</h2>
          {section.body.map((block, index) =>
            Array.isArray(block) ? (
              <ul
                key={index}
                className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-cream-dim"
              >
                {block.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="text-sm leading-relaxed text-cream-dim">
                {block}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}

function Shell({ document: doc }: { document: LegalDocument }) {
  const { locale } = useLocale();
  const t = useT();

  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16">
        <Link
          to="/"
          className="focus-ring inline-flex w-fit items-center gap-2 rounded py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {t("auth.backHome")}
        </Link>

        {/* The guard. While the operator's own details are still placeholders
            this page is not a policy, and saying so at the top in the reader's
            language is the only way that fact survives a deploy. */}
        {isDraft() && (
          <p
            role="alert"
            className="rounded-2xl border border-line-strong p-4 text-sm text-cream-bright"
          >
            {draftNotice(legalLocale(locale))}
          </p>
        )}

        {/* The footer link is in the reader's language; the document is in one
            of three. Saying which, in the language they actually chose, is the
            difference between a translated link that lied and one that told
            them where they were going. */}
        {legalLocale(locale) !== locale && (
          <p className="text-xs leading-relaxed text-cream-faint">
            {t("legal.languageNote")}
          </p>
        )}

        <Body document={doc} />

        <p className="border-t border-line pt-6 text-xs text-cream-faint">
          <Link
            to={doc === privacyFor(legalLocale(locale)) ? "/terms" : "/privacy"}
            className="focus-ring inline-flex items-center rounded py-1.5 underline underline-offset-4 hover:text-cream-bright"
          >
            {doc === privacyFor(legalLocale(locale)) ? termsFor(legalLocale(locale)).title : privacyFor(legalLocale(locale)).title}
          </Link>
        </p>
      </div>
    </main>
  );
}

export function Privacy() {
  const { locale } = useLocale();
  return <Shell document={privacyFor(legalLocale(locale))} />;
}

export function Terms() {
  const { locale } = useLocale();
  return <Shell document={termsFor(legalLocale(locale))} />;
}
