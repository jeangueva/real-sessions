/**
 * `cn`, for shadcn components a tool adds to this project.
 *
 * components.json points shadcn's `utils` alias here, so a component that a
 * canvas or the shadcn CLI drops into this folder finds the helper it imports
 * (`import { cn } from "@ds/lib/utils"`). Mockio's own components do not use
 * it: they write their classes as template strings.
 *
 * It joins class names the way clsx does — strings, numbers, arrays and
 * `{ class: condition }` objects, skipping anything falsy. Unlike shadcn's
 * default it does not run tailwind-merge, so a later `px-5` does not remove an
 * earlier `px-3`: pass one or the other, or install tailwind-merge and wrap
 * the result.
 */
export type ClassValue = string | number | bigint | boolean | null | undefined | ClassDictionary | ClassValue[];
export type ClassDictionary = Record<string, unknown>;

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input && input !== 0) continue;
    if (typeof input === "string" || typeof input === "number" || typeof input === "bigint") out.push(String(input));
    else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else if (typeof input === "object") {
      for (const [name, on] of Object.entries(input)) if (on) out.push(name);
    }
  }
  return out.join(" ");
}
