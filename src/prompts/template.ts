/**
 * Strict `{{variable}}` renderer.
 *
 * Silent placeholder leakage is the failure mode that matters here: a prompt
 * shipped with a literal `{{company_name}}` in it produces a plausible-sounding
 * but wrong interview. So an unresolved placeholder throws instead of passing.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  const missing = new Set<string>();

  const rendered = template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, name: string) => {
      const value = variables[name];
      if (value === undefined || value.trim() === "") {
        missing.add(name);
        return "";
      }
      return value;
    },
  );

  if (missing.size > 0) {
    throw new Error(
      `Missing or empty prompt variable(s): ${[...missing].sort().join(", ")}`,
    );
  }
  return rendered;
}

/** Maps the typed context onto the snake_case names used in the prompt text. */
export function toTemplateVariables(context: {
  candidateName: string;
  targetRole: string;
  companyName: string;
  companyCulture: string;
  industry: string;
  interviewStage: string;
}): Record<string, string> {
  return {
    candidate_name: context.candidateName,
    target_role: context.targetRole,
    company_name: context.companyName,
    company_culture: context.companyCulture,
    industry: context.industry,
    interview_stage: context.interviewStage,
  };
}
