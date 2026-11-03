import { definePreviews } from "../../preview";
import { Notice } from "./Notice";

export const NoticePreviews = definePreviews([
  {
    id: "info",
    title: "A fact about the screen",
    kind: "default",
    description:
      "The information tone: a quiet fact, announced politely, with the icon in the dimmed ink so the words carry the reading.",
    render: () => (
      <div className="max-w-md">
        <Notice>Preparando tu material… tarda menos de un minuto.</Notice>
      </div>
    ),
    code: `<Notice>Preparando tu material… tarda menos de un minuto.</Notice>`,
  },
  {
    id: "error",
    title: "Something could not be done",
    kind: "state",
    state: "error",
    description:
      "The error tone: amber, not red — nothing in this product marks a person wrong — and announced assertively, so it is read straight away instead of waiting its turn.",
    render: () => (
      <div className="max-w-md">
        <Notice tone="error">Ese archivo no lo podemos leer. Usa PDF, Word (.docx) o una foto (JPG o PNG).</Notice>
      </div>
    ),
    code: `<Notice tone="error">Ese archivo no lo podemos leer. Usa PDF, Word (.docx) o una foto (JPG o PNG).</Notice>`,
  },
  {
    id: "success",
    title: "Something was done",
    kind: "state",
    state: "success",
    description: "The success tone: green, announced politely, waiting its turn among the other messages.",
    render: () => (
      <div className="max-w-md">
        <Notice tone="success">Listo. Entra tranquilo: ya lo ensayaste.</Notice>
      </div>
    ),
    code: `<Notice tone="success">Listo. Entra tranquilo: ya lo ensayaste.</Notice>`,
  },
  {
    id: "a-long-message-in-german",
    title: "A long message in German at 320px",
    kind: "edge",
    width: 320,
    description:
      "German runs about 30% longer than Spanish. The box grows to two lines, the icon stays at the top of the first one, and nothing is cut.",
    render: () => (
      <div lang="de" className="max-w-[20rem]">
        <Notice tone="error">
          Wir konnten die Antwort nicht bewerten. Versuch es nochmal.
        </Notice>
      </div>
    ),
    code: `<Notice tone="error">
  Wir konnten die Antwort nicht bewerten. Versuch es nochmal.
</Notice>`,
  },
  {
    id: "blaming-the-person",
    title: "A message that blames the person",
    kind: "misuse",
    description: "\"No eres válido para este programa.\" A message that closes the door on the person instead of naming what failed.",
    why: "Nothing in this product marks a person wrong: the colours are cream, mustard and green, and there is no red. An error message names the thing that failed and what to do about it — \"Ese archivo no lo podemos leer. Usa PDF, Word (.docx) o una foto (JPG o PNG)\" — because the person can act on that and not on a verdict.",
    render: () => (
      <div className="max-w-md">
        <Notice tone="error">No eres válido para este programa.</Notice>
      </div>
    ),
    code: `{/* Don't */}
<Notice tone="error">No eres válido para este programa.</Notice>

{/* Do */}
<Notice tone="error">Ese archivo no lo podemos leer. Usa PDF, Word (.docx) o una foto (JPG o PNG).</Notice>`,
  },
]);
