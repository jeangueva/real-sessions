import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@ds/components/Badge";
import type { Preview } from "@ds/preview";
import { componentByName } from "../content";
import { parseMarkdown, renderMarkdown, withoutLeadingTitle } from "../markdown";
import { themeVariables } from "../theme";
import { Code, DoAndDont, Facts, Mono, Prose, Section, Subhead, Table } from "../ui";

/**
 * A component's page: the previews, the contract, the guidance and the code.
 *
 * The order is the order a person reads in: what it looks like, then what
 * it promises, then how to write it, then what it is made of. The contract
 * is the page's spine — it is the same object the tests check and the
 * registry is built from, so nothing here can drift from the code.
 */

/** A label that is a fact, set in the instrument voice. */
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[0.4rem] border border-line px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.07em] text-cream-faint">
      {children}
    </span>
  );
}

function PreviewCard({ preview }: { preview: Preview }) {
  // A preview may ask for a theme the site is not in. The variables of that
  // theme are read from the product stylesheet, so the specimen shows the
  // palette the product has — not a copy of it that drifts.
  const themed = preview.theme && preview.theme !== "auto" ? preview.theme : null;
  const style = themed ? (themeVariables(themed) as CSSProperties) : undefined;

  return (
    <article className="surface overflow-hidden">
      <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-cream-bright">{preview.title}</h3>
          <p className="mt-1 text-pretty text-sm text-cream-dim">{preview.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {preview.state && <Tag>{preview.state}</Tag>}
          <Tag>{preview.kind}</Tag>
        </div>
      </header>

      <div
        className="flex min-h-[7rem] items-center justify-center bg-surface-base p-6"
        style={preview.width ? { ...style, maxWidth: preview.width } : style}
      >
        <div className="w-full">{preview.render()}</div>
      </div>

      {preview.why && (
        <p className="border-y border-line bg-[rgb(var(--step)/0.08)] px-4 py-3 text-pretty text-sm text-cream-dim sm:px-5">
          <span className="font-semibold text-cream-bright">Why it is wrong: </span>
          {preview.why}
        </p>
      )}

      <div className="px-4 py-4 sm:px-5">
        <Code code={preview.code} />
      </div>
    </article>
  );
}

export default function ComponentPage() {
  const { name = "" } = useParams();
  const entry = componentByName(name);
  const [tab, setTab] = useState<"code" | "contract" | "previews">("code");

  if (!entry) {
    return (
      <div className="max-w-[46rem]">
        <h1 className="text-title font-semibold text-cream-bright">No component called {name}</h1>
        <p className="mt-3 text-cream-dim">
          Nothing in the catalogue is called “{name}”.{" "}
          <Link to="/" className="text-accent-text underline underline-offset-2">
            Back to the overview
          </Link>
          .
        </p>
      </div>
    );
  }

  const { contract, previews, docs, source, contractSource, previewsSource } = entry;
  // The guidance carries its own frontmatter (name, level, status); the
  // page shows the contract's version of those, so the frontmatter is read
  // and dropped rather than printed.
  const guidance = docs ? renderMarkdown(withoutLeadingTitle(parseMarkdown(docs).body, contract.name)) : "";

  const tabs = [
    { id: "code", label: "The code", text: source },
    { id: "contract", label: "The contract", text: contractSource },
    { id: "previews", label: "The previews", text: previewsSource },
  ] as const;

  return (
    <div>
      <header className="max-w-[46rem]">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">
          {contract.level} · {contract.status}
        </p>
        <h1 className="mt-3 text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-cream-bright">
          {contract.name}
        </h1>
        <p className="mt-3 text-pretty text-lg leading-relaxed text-cream-dim">{contract.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge>v{contract.version}</Badge>
          <Tag>{contract.level}</Tag>
          <Tag>{contract.status}</Tag>
          {contract.dependencies.map((dependency) => (
            <Tag key={dependency}>{dependency}</Tag>
          ))}
        </div>
      </header>

      <Section title="What it looks like" hint="Every state, variant and edge the contract promises.">
        <div className="grid gap-4">
          {previews.map((preview) => (
            <PreviewCard key={preview.id} preview={preview} />
          ))}
        </div>
      </Section>

      <Section
        title="The contract"
        hint="What this component promises to keep doing. The tests check every line of it against the code."
      >
        <div className="space-y-10">
          <div>
            <Subhead>Props</Subhead>
            <Table head={["Prop", "Type", "Default", "What it does"]}>
              {Object.entries(contract.props).map(([propName, prop]) => (
                <tr key={propName}>
                  <td className="border-b border-line px-3.5 py-3 align-top">
                    <Mono>{propName}</Mono>
                    {prop.required && (
                      <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-[0.06em] text-accent-text">
                        required
                      </span>
                    )}
                  </td>
                  <td className="border-b border-line px-3.5 py-3 align-top">
                    <Mono>{prop.type}</Mono>
                  </td>
                  <td className="border-b border-line px-3.5 py-3 align-top">
                    <Mono>{prop.default ?? "—"}</Mono>
                  </td>
                  <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">
                    <p className="text-pretty">{prop.description}</p>
                    {prop.values && (
                      <dl className="mt-2 space-y-1.5">
                        {Object.entries(prop.values).map(([value, what]) => (
                          <div key={value} className="flex gap-2">
                            <dt className="shrink-0">
                              <Mono>{value}</Mono>
                            </dt>
                            <dd className="text-pretty text-sm">{what}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          {contract.slots.length > 0 && (
            <div>
              <Subhead>Slots</Subhead>
              <Table head={["Slot", "What goes in it"]}>
                {contract.slots.map((slot) => (
                  <tr key={slot.name}>
                    <td className="border-b border-line px-3.5 py-3 align-top">
                      <Mono>{slot.name}</Mono>
                    </td>
                    <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{slot.description}</td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          <div>
            <Subhead>States</Subhead>
            <Table head={["State", "How it looks", "How it gets there"]}>
              {contract.states.map((state) => (
                <tr key={state.name}>
                  <td className="border-b border-line px-3.5 py-3 align-top">
                    <Mono>{state.name}</Mono>
                  </td>
                  <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{state.description}</td>
                  <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{state.trigger}</td>
                </tr>
              ))}
            </Table>
          </div>

          {contract.events.length > 0 && (
            <div>
              <Subhead>Events</Subhead>
              <Table head={["Event", "Signature", "When it fires"]}>
                {contract.events.map((event) => (
                  <tr key={event.name}>
                    <td className="border-b border-line px-3.5 py-3 align-top">
                      <Mono>{event.name}</Mono>
                    </td>
                    <td className="border-b border-line px-3.5 py-3 align-top">
                      <Mono>{event.signature}</Mono>
                    </td>
                    <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{event.firesWhen}</td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          <div>
            <Subhead>Motion</Subhead>
            <Facts items={contract.motion} />
          </div>

          <div>
            <Subhead>Accessibility</Subhead>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Role</dt>
                <dd className="mt-0.5 text-cream-dim">{contract.accessibility.role}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Keyboard</dt>
                <dd className="mt-1 space-y-1">
                  {contract.accessibility.keyboard.length === 0 ? (
                    <span className="text-cream-dim">Not interactive.</span>
                  ) : (
                    contract.accessibility.keyboard.map((key) => (
                      <span key={key.key} className="flex gap-3 text-cream-dim">
                        <Mono>{key.key}</Mono>
                        <span className="text-pretty">{key.effect}</span>
                      </span>
                    ))
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">ARIA</dt>
                <dd className="mt-1 space-y-1">
                  {contract.accessibility.aria.map((attribute) => (
                    <span key={attribute.attribute} className="flex gap-3 text-cream-dim">
                      <Mono>{attribute.attribute}</Mono>
                      <span className="text-pretty">
                        {attribute.managedBy === "component" ? "managed by the component" : "the consumer's to set"}{" "}
                        — {attribute.note}
                      </span>
                    </span>
                  ))}
                </dd>
              </div>
              {(
                [
                  ["Reduced motion", contract.accessibility.reducedMotion],
                  ["Contrast", contract.accessibility.contrast],
                  ["Focus", contract.accessibility.focus],
                  ["Target size", contract.accessibility.targetSize],
                  ["Screen reader", contract.accessibility.screenReader],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">{label}</dt>
                  <dd className="mt-0.5 text-pretty text-cream-dim">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <Subhead>What it says</Subhead>
            <div className="space-y-4">
              <Facts items={contract.content.voice} />
              {contract.content.limits.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Limits</p>
                  <Facts items={contract.content.limits} />
                </div>
              )}
              {contract.content.examples.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Examples</p>
                  <div className="flex flex-wrap gap-2">
                    {contract.content.examples.map((example) => (
                      <span
                        key={example}
                        className="rounded-[0.4rem] bg-[rgb(var(--cream)/0.07)] px-2.5 py-1 text-sm text-cream-dim"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Subhead>When to use it</Subhead>
            <Facts items={contract.usage.when} />
            {contract.usage.whenNot.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">
                  When not to use it
                </p>
                <Table head={["Situation", "Use instead"]}>
                  {contract.usage.whenNot.map((row) => (
                    <tr key={row.situation}>
                      <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{row.situation}</td>
                      <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{row.instead}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
            <div className="mt-5">
              <DoAndDont do={contract.usage.do} dont={contract.usage.dont} />
            </div>
          </div>

          <div>
            <Subhead>Tokens</Subhead>
            <div className="flex flex-wrap gap-1.5">
              {contract.tokens.map((token) => (
                <Tag key={token}>{token}</Tag>
              ))}
            </div>
          </div>

          {contract.related.length > 0 && (
            <div>
              <Subhead>Related</Subhead>
              <dl className="space-y-3 text-sm">
                {contract.related.map((related) => (
                  <div key={related.name}>
                    <dt>
                      <Link
                        to={`/component/${related.name}`}
                        className="font-semibold text-cream-bright underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                      >
                        {related.name}
                      </Link>
                    </dt>
                    <dd className="mt-0.5 text-pretty text-cream-dim">{related.difference}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <Subhead>Languages</Subhead>
            <dl className="space-y-3 text-sm">
              {(
                [
                  ["Right to left", contract.i18n.rtl],
                  ["Longer text", contract.i18n.textExpansion],
                  ["Numbers and dates", contract.i18n.formatting],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">{label}</dt>
                  <dd className="mt-0.5 text-pretty text-cream-dim">{value}</dd>
                </div>
              ))}
            </dl>
            {contract.i18n.strings.length > 0 && (
              <div className="mt-4">
                <Table head={["String", "Prop that overrides it"]}>
                  {contract.i18n.strings.map((string) => (
                    <tr key={string.text}>
                      <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">{string.text}</td>
                      <td className="border-b border-line px-3.5 py-3 align-top">
                        <Mono>{string.prop}</Mono>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </div>

          <div>
            <Subhead>Responsive</Subhead>
            <Facts items={contract.responsive.behaviour} />
            <p className="mt-3 text-sm text-cream-dim">
              Designed for a container of at least <Mono>{contract.responsive.minWidth}</Mono>.
            </p>
          </div>

          <div>
            <Subhead>In a design tool</Subhead>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Registry item</dt>
                <dd className="mt-0.5">
                  <Mono>{contract.designTool.registryItem}</Mono>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Import</dt>
                <dd className="mt-1">
                  <Code code={contract.designTool.importStatement} />
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Canvas props</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {contract.designTool.canvasProps.map((prop) => (
                    <Tag key={prop}>{prop}</Tag>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-cream-faint">Placement</dt>
                <dd className="mt-0.5 text-pretty text-cream-dim">{contract.designTool.placement}</dd>
              </div>
            </dl>
          </div>

          {contract.appCounterpart && (
            <div>
              <Subhead>In the product</Subhead>
              <p className="text-sm text-cream-dim">
                The product keeps its own copy, at{" "}
                <Mono>web/src/{contract.appCounterpart.file}</Mono>, exported as{" "}
                <Mono>{contract.appCounterpart.exportName}</Mono>. These are the differences between the two, so
                neither one is a lie about the other.
              </p>
              <div className="mt-3">
                <Facts items={contract.appCounterpart.differences} />
              </div>
            </div>
          )}

          <div>
            <Subhead>What changed</Subhead>
            <Table head={["Version", "What changed"]}>
              {contract.changelog.map((entry) => (
                <tr key={entry.version}>
                  <td className="border-b border-line px-3.5 py-3 align-top">
                    <Mono>{entry.version}</Mono>
                  </td>
                  <td className="border-b border-line px-3.5 py-3 align-top text-cream-dim">
                    <ul className="space-y-1">
                      {entry.changes.map((change) => (
                        <li key={change} className="text-pretty">
                          {change}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      </Section>

      {guidance && (
        <Section title="The guidance" hint="How to write and compose it.">
          <Prose html={guidance} />
        </Section>
      )}

      <Section title="The code" hint="The three files this component owns, as they are.">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`focus-ring rounded-lg border px-3 py-1.5 text-xs transition-colors duration-150 ${
                tab === item.id
                  ? "border-line-strong bg-[rgb(var(--cream)/0.08)] text-cream-bright"
                  : "border-line text-cream-dim hover:text-cream-bright"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Code code={tabs.find((item) => item.id === tab)?.text ?? ""} />
      </Section>
    </div>
  );
}
