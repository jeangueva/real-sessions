import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Action, Field, Panel, Eyebrow } from "@/design-system";
import { PageHeader } from "./AppShell";
import { fetchPreferences } from "@/lib/api";

const COMPANIES = ["Stripe", "Amazon", "Airbnb", "Mercado Libre"];
const ROLES = [
  "Senior Product Designer",
  "Backend Engineer",
  "Growth PM",
  "Data Analyst",
];
const STAGES = ["Behavioral", "Technical deep dive", "System design"];

/** Collects exactly the variables the Phase 1 prompt needs — nothing more. */
export function SessionSetup() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(COMPANIES[0]!);
  const [role, setRole] = useState(ROLES[0]!);
  const [stage, setStage] = useState(STAGES[0]!);

  // Saved preferences pre-fill the form; a failure here is not worth an error
  // banner, since every field already has a working default.
  useEffect(() => {
    fetchPreferences()
      .then(({ preferences }) => {
        if (COMPANIES.includes(preferences.defaultCompany)) {
          setCompany(preferences.defaultCompany);
        }
        if (ROLES.includes(preferences.defaultRole)) {
          setRole(preferences.defaultRole);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <PageHeader
        title="Start an interview"
        meta="Seven turns, about ten minutes. You can stop at any point."
      />

      <div className="px-6 py-10 lg:px-10">
        <div className="grid max-w-4xl gap-6 md:grid-cols-2">
          <Panel variant="glass" className="flex flex-col gap-6 p-6">
            <Eyebrow>Interview setup</Eyebrow>

            <ChoiceField label="Company" options={COMPANIES} value={company} onChange={setCompany} />
            <ChoiceField label="Target role" options={ROLES} value={role} onChange={setRole} />
            <ChoiceField label="Stage" options={STAGES} value={stage} onChange={setStage} />
          </Panel>

          <div className="flex flex-col justify-between gap-6">
            <Panel className="p-6">
              <Eyebrow>What to expect</Eyebrow>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-cream-dim">
                <li>
                  The interviewer stays in character. It will not translate a
                  word or correct your grammar mid-interview.
                </li>
                <li>
                  Vague answers get challenged. Have a specific example and a
                  number ready.
                </li>
                <li>
                  Feedback on your English comes after — never during.
                </li>
              </ul>
            </Panel>

            {/* self-start: the parent is a stretch-aligned flex column, which
                pulled the pill to the full column width. */}
            <Action
              withArrow
              className="self-start"
              onClick={() =>
                navigate("/app/session", { state: { company, role, stage } })
              }
            >
              Begin
            </Action>
          </div>
        </div>
      </div>
    </>
  );
}

/** Pill-group selector. Used wherever a short option list needs picking. */
function ChoiceField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={option === value}
            onClick={() => onChange(option)}
            className={`focus-ring rounded-full border px-4 py-1.5 text-xs transition-colors duration-300 sm:text-sm ${
              option === value
                ? "border-cream bg-cream text-black"
                : "border-line text-cream-dim hover:text-cream-bright"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </Field>
  );
}
