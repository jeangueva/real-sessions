import { Link, useParams } from "react-router-dom";
import { docBySlug } from "../content";
import { renderMarkdown, withoutLeadingTitle } from "../markdown";
import { Prose } from "../ui";

/**
 * A document: a foundation or a guide.
 *
 * The Markdown is the document. The frontmatter gives it the title, the
 * group and the summary the page shows above it, and the body is read as
 * written.
 */

export default function GuidePage({ group }: { group: "Foundations" | "Guides" }) {
  const { slug = "" } = useParams();
  const found = docBySlug(slug);

  if (!found) {
    return (
      <div className="max-w-[46rem]">
        <h1 className="text-title font-semibold text-cream-bright">That document does not exist</h1>
        <p className="mt-3 text-cream-dim">
          Nothing here is called “{slug}”.{" "}
          <Link to="/" className="text-accent-text underline underline-offset-2">
            Back to the overview
          </Link>
          .
        </p>
      </div>
    );
  }

  const { doc } = found;
  const body = withoutLeadingTitle(doc.body, doc.title);

  return (
    <article className="max-w-[46rem]">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">
        {group} · {doc.path}
      </p>
      <h1 className="mt-3 text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-cream-bright">
        {doc.title}
      </h1>
      <p className="mt-3 text-pretty text-lg leading-relaxed text-cream-dim">{doc.summary}</p>
      <div className="mt-8">
        <Prose html={renderMarkdown(body)} />
      </div>
    </article>
  );
}
