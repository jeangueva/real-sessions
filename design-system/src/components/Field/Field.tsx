import type { HTMLAttributes, ReactNode } from "react";

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  /** What the control asks for, in a few words: "Email", "Contraseña", "Modo por defecto". Rendered as a <label>. */
  label: string;
  /** One or two sentences under the control: what the value is used for, or the rule it must meet. */
  hint?: string;
  /**
   * The id of the control inside, so the label names it and a click on the
   * label focuses it. Leave it off only when the control names itself
   * (a radiogroup or a Segmented with its own aria-label).
   */
  htmlFor?: string;
  /**
   * An id for the hint paragraph, so the control can point at it with
   * aria-describedby and a screen reader reads the hint on focus.
   */
  hintId?: string;
  /** The control: an <input>, <select> or <textarea> with the field-control class, or a control that names itself. */
  children: ReactNode;
  /** Extra classes, appended. For layout, e.g. a field that spans more than its cell in a grid (lg:col-span-2). */
  className?: string;
}

/**
 * Labelled form control wrapper. Keeps the label, control and hint spacing
 * the same on every form.
 *
 * It draws no box of its own: the well, its border and the focus halo belong
 * to the control's `field-control` class, so a select, an input and a
 * textarea look like one family whether or not they sit in a Field.
 */
export function Field({ label, hint, htmlFor, hintId, children, className = "", ...props }: FieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} {...props}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-cream">
        {label}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-cream-faint">
          {hint}
        </p>
      )}
    </div>
  );
}
