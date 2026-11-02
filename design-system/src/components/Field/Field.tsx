import type { ReactNode } from "react";

export interface FieldProps {
  /** The name of the control, in sentence case: "Tu nombre", "Correo". */
  label: string;
  /** The control: an input, a select, a textarea. */
  children: ReactNode;
  /** One line under the control saying what it wants. */
  hint?: string;
  /** The id of the control the label names. Leave it out when the control sits inside the label. */
  htmlFor?: string;
  /** Extra classes, appended. For layout — a field that spans more than its cell in a grid. */
  className?: string;
}

/**
 * A labelled form control: the name above it, the control, the hint below.
 *
 * The spacing of the three is the same in every form in the product, and that
 * is the whole point of the component. A form is a stack of these, and the
 * distance between a label and its field must not depend on who wrote it.
 */
export function Field({ label, hint, children, htmlFor, className = "" }: FieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-cream">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-cream-faint">{hint}</p>}
    </div>
  );
}
