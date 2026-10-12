import { FileDown } from "lucide-react";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * Saves the report as a PDF through the browser's own print dialog.
 *
 * Every phone and laptop can "save as PDF" from there, and it prints exactly
 * the page the student read — no second layout to keep in step with this one.
 * The light theme is forced for the moment of printing, then put back.
 */
export function PrintReport() {
  const t = useThesisT();
  const print = () => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = "light";
    const restore = () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    // Opened `<details>` print their content; closed ones are opened by CSS.
    window.print();
  };
  return (
    <button
      type="button"
      onClick={print}
      className="focus-ring inline-flex items-center gap-2 rounded-full bg-surface-card px-4 py-2.5 text-sm font-semibold text-cream-bright shadow-card transition-transform duration-150 active:scale-[0.97]"
    >
      <FileDown aria-hidden className="h-4 w-4" />
      {t("printReport")}
    </button>
  );
}
