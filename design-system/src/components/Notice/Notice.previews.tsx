import { definePreviews } from "../../preview";
import { Action } from "../Action";
import { Field } from "../Field";
import { Panel } from "../Panel";
import { Notice } from "./Notice";

export const NoticePreviews = definePreviews([
  {
    id: "error",
    title: "Error",
    kind: "default",
    description: "The sign-in form's answer when signing in failed: what happened, then what to try. Orange, never red, and announced at once as an alert.",
    render: () => <Notice tone="error">No funcionó. Inténtalo otra vez, o entra con tu correo y contraseña.</Notice>,
    code: `<Notice tone="error">No funcionó. Inténtalo otra vez, o entra con tu correo y contraseña.</Notice>`,
  },
  {
    id: "tones",
    title: "Tones",
    kind: "variant",
    description: "error did not work and says what next; success worked; info is neither. Each carries its own icon, and the words alone still say which it is.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Notice tone="error">No se pudo restablecer la contraseña.</Notice>
        <Notice tone="success">Guardado</Notice>
        <Notice tone="info">Si esa dirección tiene una cuenta, el enlace ya está en camino.</Notice>
      </div>
    ),
    code: `<Notice tone="error">No se pudo restablecer la contraseña.</Notice>
<Notice tone="success">Guardado</Notice>
<Notice>Si esa dirección tiene una cuenta, el enlace ya está en camino.</Notice>`,
  },
  {
    id: "long-portuguese-phone",
    title: "A two-sentence message in Portuguese at phone width",
    kind: "edge",
    width: 320,
    description: "The text wraps beside the icon and the box grows downward; the icon stays on the first line.",
    render: () => (
      <div lang="pt-BR">
        <Notice tone="error">Não funcionou. Tente novamente com o link do e-mail.</Notice>
      </div>
    ),
    code: `<div lang="pt-BR">
  <Notice tone="error">Não funcionou. Tente novamente com o link do e-mail.</Notice>
</div>`,
  },
  {
    id: "one-word",
    title: "One word",
    kind: "edge",
    description: "The shortest message in the product. The box still fills its container, so it lines up with the fields above it.",
    render: () => (
      <div className="max-w-md">
        <Notice tone="success">Guardado</Notice>
      </div>
    ),
    code: `<Notice tone="success">Guardado</Notice>`,
  },
  {
    id: "unsubscribe",
    title: "The unsubscribe page",
    kind: "in-context",
    description: "The page's only answer once the request returns: the paragraph and the button are replaced by a success Notice under the heading.",
    render: () => (
      <Panel variant="raised" className="flex max-w-md flex-col gap-5 p-8">
        <h2 className="text-title font-semibold text-cream-bright">Dejar de recibir estos correos</h2>
        <Notice tone="success">Listo. No vas a recibir recordatorios ni resúmenes en esta dirección.</Notice>
      </Panel>
    ),
    code: `<Panel variant="raised" className="flex w-full max-w-md flex-col gap-5 p-8">
  <h1 className="text-title font-semibold text-cream-bright">Dejar de recibir estos correos</h1>
  {state === "done" || state === "failed" ? (
    <Notice tone={state === "done" ? "success" : "error"}>{message}</Notice>
  ) : (
    …
  )}
</Panel>`,
  },
  {
    id: "dead-reset-link",
    title: "A spent reset link",
    kind: "in-context",
    description: "The reset form after the link turned out to be spent: the Notice says what happened and the one solid Action right after it does the next step.",
    render: () => (
      <form onSubmit={(event) => event.preventDefault()} className="flex max-w-md flex-col gap-5">
        <Field label="Contraseña nueva" htmlFor="preview-notice-password" hint="Al menos 8 caracteres. Una frase funciona bien.">
          <input id="preview-notice-password" type="password" autoComplete="new-password" className="field-control text-sm text-cream-bright" />
        </Field>
        <Notice tone="error">No se pudo restablecer la contraseña.</Notice>
        <Action type="button" withArrow className="self-start">
          Pedir un enlace nuevo
        </Action>
      </form>
    ),
    code: `{error && <Notice tone="error">{error}</Notice>}
{deadLink && (
  <Link to="/reset" replace className="self-start">
    <Action type="button" withArrow>Pedir un enlace nuevo</Action>
  </Link>
)}`,
  },
  {
    id: "standing-instructions",
    title: "Instructions in a Notice",
    kind: "misuse",
    description: "The password rule shown as an info Notice above the form, before anything has happened.",
    why: "A Notice is a live region that answers something the person just did. A rule that was true before they typed is announced as if it were news, and it trains people to skim past the box that will later tell them it did not work. Put the rule in the Field's hint.",
    render: () => <Notice tone="info">Al menos 8 caracteres. Una frase funciona bien.</Notice>,
    code: `{/* Don't */}
<Notice>Al menos 8 caracteres. Una frase funciona bien.</Notice>
{/* Do */}
<Field label="Contraseña" htmlFor="password" hint="Al menos 8 caracteres. Una frase funciona bien.">…</Field>`,
  },
  {
    id: "stacked",
    title: "Notices stacked",
    kind: "misuse",
    description: "Three Notices for one failed submit.",
    why: "Each one is its own alert, so a screen reader is interrupted three times, and the eye has to work out which box matters. One outcome is one Notice: merge the message into one or two sentences.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Notice tone="error">No funcionó.</Notice>
        <Notice tone="error">Inténtalo otra vez.</Notice>
        <Notice tone="info">O entra con tu correo y contraseña.</Notice>
      </div>
    ),
    code: `{/* Don't */}
<Notice tone="error">No funcionó.</Notice>
<Notice tone="error">Inténtalo otra vez.</Notice>
<Notice>O entra con tu correo y contraseña.</Notice>`,
  },
]);
