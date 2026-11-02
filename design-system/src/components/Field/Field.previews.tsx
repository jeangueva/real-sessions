import { definePreviews } from "../../preview";
import { Action } from "../Action";
import { Notice } from "../Notice";
import { Panel } from "../Panel";
import { Field } from "./Field";

const INPUT = "field-control text-sm text-cream-bright placeholder:text-cream-faint";

export const FieldPreviews = definePreviews([
  {
    id: "input",
    title: "With an input",
    kind: "default",
    description: "The sign-in email: a label tied to the input by htmlFor and id, and no hint because the label says it all.",
    render: () => (
      <Field label="Email" htmlFor="preview-field-email">
        <input id="preview-field-email" type="email" autoComplete="email" placeholder="you@example.com" className={INPUT} />
      </Field>
    ),
    code: `<Field label="Email" htmlFor="email">
  <input
    id="email"
    type="email"
    autoComplete="email"
    placeholder="you@example.com"
    className="field-control text-sm text-cream-bright placeholder:text-cream-faint"
  />
</Field>`,
  },
  {
    id: "input-with-hint",
    title: "With a hint",
    kind: "variant",
    description: "The rule the password must meet sits under it before anyone types, and hintId wires it to the input so a screen reader reads it on focus.",
    render: () => (
      <Field
        label="Contraseña"
        htmlFor="preview-field-password"
        hint="Al menos 8 caracteres. Una frase funciona bien."
        hintId="preview-field-password-hint"
      >
        <input
          id="preview-field-password"
          type="password"
          autoComplete="new-password"
          aria-describedby="preview-field-password-hint"
          className="field-control text-sm text-cream-bright"
        />
      </Field>
    ),
    code: `<Field
  label="Contraseña"
  htmlFor="password"
  hint="Al menos 8 caracteres. Una frase funciona bien."
  hintId="password-hint"
>
  <input
    id="password"
    type="password"
    autoComplete="new-password"
    aria-describedby="password-hint"
    className="field-control text-sm text-cream-bright"
  />
</Field>`,
  },
  {
    id: "select-with-hint",
    title: "With a select",
    kind: "variant",
    description: "A setting from the interview defaults. The select takes the same field-control well as an input, and the hint explains what the choice changes.",
    render: () => (
      <Field
        label="Modo por defecto"
        htmlFor="preview-field-mode"
        hint="El modo real retiene el coaching hasta el informe, como hace una entrevista de verdad. Vale más XP."
      >
        <select id="preview-field-mode" defaultValue="practice" className="field-control text-sm text-cream-bright">
          <option value="practice">Práctica — coaching mientras hablas</option>
          <option value="real">Real — sin ayuda hasta el final</option>
        </select>
      </Field>
    ),
    code: `<Field
  label="Modo por defecto"
  htmlFor="mode"
  hint="El modo real retiene el coaching hasta el informe, como hace una entrevista de verdad. Vale más XP."
>
  <select id="mode" value={mode} onChange={onChange} className="field-control text-sm text-cream-bright">
    <option value="practice">Práctica — coaching mientras hablas</option>
    <option value="real">Real — sin ayuda hasta el final</option>
  </select>
</Field>`,
  },
  {
    id: "select-without-hint",
    title: "A select without a hint",
    kind: "variant",
    description: "When the label is enough, the hint is left out and nothing is drawn under the control.",
    render: () => (
      <Field label="Sector por defecto" htmlFor="preview-field-sector">
        <select id="preview-field-sector" defaultValue="" className="field-control text-sm text-cream-bright">
          <option value="">Todos los sectores</option>
        </select>
      </Field>
    ),
    code: `<Field label="Sector por defecto" htmlFor="sector">
  <select id="sector" className="field-control text-sm text-cream-bright">
    <option value="">Todos los sectores</option>
    {sectors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
  </select>
</Field>`,
  },
  {
    id: "textarea",
    title: "With a textarea",
    kind: "variant",
    description: "The profile's links, one per line. The textarea takes field-control plus resize-none so the well keeps its shape.",
    render: () => (
      <Field label="Uno por línea" htmlFor="preview-field-links">
        <textarea
          id="preview-field-links"
          rows={6}
          placeholder={"github.com/you\nlinkedin.com/in/you\nyour-portfolio.com"}
          className="field-control resize-none text-sm text-cream-bright placeholder:text-cream-faint"
        />
      </Field>
    ),
    code: `<Field label="Uno por línea" htmlFor="links">
  <textarea
    id="links"
    rows={6}
    placeholder={"github.com/you\\nlinkedin.com/in/you\\nyour-portfolio.com"}
    className="field-control resize-none text-sm text-cream-bright placeholder:text-cream-faint"
  />
</Field>`,
  },
  {
    id: "textarea-with-hint",
    title: "A textarea with a hint",
    kind: "variant",
    description: "The same well with a hint under it; an optional field says so at the start of the hint.",
    render: () => (
      <Field label="Empresa que tienes en mente" htmlFor="preview-field-company" hint="Opcional. Nos dice qué empleador construir después.">
        <textarea id="preview-field-company" rows={3} placeholder="Nubank" className="field-control resize-none text-sm text-cream-bright placeholder:text-cream-faint" />
      </Field>
    ),
    code: `<Field label="Empresa que tienes en mente" htmlFor="company" hint="Opcional. Nos dice qué empleador construir después.">
  <textarea id="company" rows={3} className="field-control resize-none text-sm text-cream-bright placeholder:text-cream-faint" />
</Field>`,
  },
  {
    id: "long-hint-phone",
    title: "A long hint at phone width",
    kind: "edge",
    width: 320,
    description: "The name setting's hint is the longest in the product. It wraps under the input; the input stays full width and the column only grows downward.",
    render: () => (
      <Field
        label="Tu nombre"
        htmlFor="preview-field-name"
        hint="Cómo te llama el entrevistador. Vacío, se adivina desde tu email — y si no se puede, no te llama de ninguna forma en vez de inventarlo."
      >
        <input id="preview-field-name" maxLength={60} placeholder="Cómo quieres que te saluden" className={INPUT} />
      </Field>
    ),
    code: `<Field label="Tu nombre" htmlFor="candidate-name" hint="Cómo te llama el entrevistador. Vacío, se adivina desde tu email — y si no se puede, no te llama de ninguna forma en vez de inventarlo.">
  <input id="candidate-name" maxLength={60} placeholder="Cómo quieres que te saluden" className="field-control text-sm text-cream-bright placeholder:text-cream-faint" />
</Field>`,
  },
  {
    id: "portuguese-select-phone",
    title: "Portuguese, with a long option, at phone width",
    kind: "edge",
    width: 320,
    description:
      "A select is as wide as its longest option by default; field-control's w-full min-w-0 keeps it inside a 320px column, and the longer Portuguese hint wraps.",
    render: () => (
      <div lang="pt-BR">
        <Field
          label="Modo padrão"
          htmlFor="preview-field-modo"
          hint="O modo real segura o coaching até o relatório, como faz uma entrevista de verdade. Vale mais XP."
        >
          <select id="preview-field-modo" defaultValue="practice" className="field-control text-sm text-cream-bright">
            <option value="practice">Prática — coaching enquanto você fala</option>
            <option value="real">Real — sem ajuda até o fim</option>
          </select>
        </Field>
      </div>
    ),
    code: `<div lang="pt-BR">
  <Field label="Modo padrão" htmlFor="mode" hint="O modo real segura o coaching até o relatório, como faz uma entrevista de verdade. Vale mais XP.">
    <select id="mode" className="field-control text-sm text-cream-bright">
      <option value="practice">Prática — coaching enquanto você fala</option>
      <option value="real">Real — sem ajuda até o fim</option>
    </select>
  </Field>
</div>`,
  },
  {
    id: "sign-in-form",
    title: "The sign-in form",
    kind: "in-context",
    description:
      "Email and password stacked with gap-5, the error from the last attempt as a Notice under the fields, and the one solid Action last.",
    render: () => (
      <Panel variant="raised" className="max-w-md p-8">
        <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-5">
          <Field label="Email" htmlFor="preview-signin-email">
            <input id="preview-signin-email" type="email" autoComplete="email" placeholder="you@example.com" className={INPUT} />
          </Field>
          <Field label="Contraseña" htmlFor="preview-signin-password">
            <input id="preview-signin-password" type="password" autoComplete="current-password" className="field-control text-sm text-cream-bright" />
          </Field>
          <Notice tone="error">No funcionó. Inténtalo otra vez, o entra con tu correo y contraseña.</Notice>
          <Action type="submit" className="w-full py-3">
            Iniciar sesión
          </Action>
        </form>
      </Panel>
    ),
    code: `<form onSubmit={submit} className="flex flex-col gap-5">
  <Field label="Email" htmlFor="email">
    <input id="email" type="email" required autoComplete="email" className="field-control text-sm text-cream-bright" />
  </Field>
  <Field label="Contraseña" htmlFor="password">
    <input id="password" type="password" required autoComplete="current-password" className="field-control text-sm text-cream-bright" />
  </Field>
  {error && <Notice tone="error">{error}</Notice>}
  <Action type="submit" className="w-full py-3">Iniciar sesión</Action>
</form>`,
  },
  {
    id: "unlinked-label",
    title: "A label tied to nothing",
    kind: "misuse",
    description: "The Field has no htmlFor and the input no id.",
    why: "The <label> names nothing: clicking it does not focus the input, and a screen reader announces an unnamed edit field. Pass htmlFor and give the control the same id.",
    render: () => (
      <Field label="Email">
        <input type="email" className={INPUT} />
      </Field>
    ),
    code: `{/* Don't */}
<Field label="Email">
  <input type="email" className="field-control" />
</Field>`,
  },
  {
    id: "error-in-hint",
    title: "An error written into the hint",
    kind: "misuse",
    description: "The outcome of a failed submit swapped into the hint of one field.",
    why: "The hint is quiet, faint text that explains the field before anyone types; nothing announces a change to it, so the failure goes unheard and reads as one more line of copy. Say what happened in a Notice under the fields.",
    render: () => (
      <Field label="Contraseña nueva" htmlFor="preview-field-misuse-password" hint="No se pudo restablecer la contraseña.">
        <input id="preview-field-misuse-password" type="password" className="field-control text-sm text-cream-bright" />
      </Field>
    ),
    code: `{/* Don't */}
<Field label="Contraseña nueva" htmlFor="password" hint={error ?? "Al menos 8 caracteres."}>…</Field>`,
  },
]);
