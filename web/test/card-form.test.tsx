import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CardForm } from "../src/platform/CardForm";

/**
 * The card fields have to be typeable.
 *
 * They shipped as three `<div>`s with `iframe` left at its default, which is
 * `false`. In that mode Mercado Pago's SDK binds the card number, the expiry
 * and the code as if they were inputs of ours — and because it accepts a DIV as
 * well as an INPUT for them, it mounted without a single error and simply never
 * injected its iframes. The result was a form that looked finished and could
 * not be filled in, with nothing in the console to say why.
 *
 * So the invariant is the pair, not either half: a DIV mount target is only
 * correct when `iframe` is on. Asserting `iframe === true` alone would still
 * pass if someone swapped the divs for inputs, and asserting the tag alone
 * would have passed on the broken version.
 *
 * Named `.tsx` so it runs under happy-dom — the root suite runs `*.test.ts`
 * from `web/test` in node, where there is no document to mount into.
 */

/** The three fields Mercado Pago owns, by config key. */
const SECURE = ["cardNumber", "expirationDate", "securityCode"] as const;

interface FormConfig {
  iframe?: boolean;
  form: Record<string, { id: string } | string>;
}

function mountForm() {
  const configs: FormConfig[] = [];
  vi.stubGlobal(
    "MercadoPago",
    class {
      cardForm(config: FormConfig) {
        configs.push(config);
        return { unmount: () => undefined };
      }
    },
  );
  render(
    <CardForm
      publicKey="APP_USR-test"
      amount={29.9}
      currency="PEN"
      locale="es-PE"
      onSubscribed={() => undefined}
    />,
  );
  return configs;
}

describe("the card form", () => {
  it("hands its card fields to Mercado Pago's own iframes", async () => {
    const configs = mountForm();
    await waitFor(() => expect(configs).toHaveLength(1));
    const config = configs[0]!;

    for (const field of SECURE) {
      const target = config.form[field];
      const id = typeof target === "string" ? target : target?.id;
      expect(id, `${field} names no element`).toBeTruthy();
      const host = document.getElementById(id!);
      expect(host, `${field} points at #${id}, which is not rendered`).not.toBeNull();
      // The one that matters: a container the SDK has to inject into, rather
      // than an input it would bind to, only works with `iframe` on.
      if (host!.tagName === "DIV") expect(config.iframe).toBe(true);
      else expect(host!.tagName).toBe("INPUT");
    }
  });

  it("gives every field the SDK demands an element to use", async () => {
    const configs = mountForm();
    await waitFor(() => expect(configs).toHaveLength(1));
    const { form } = configs[0]!;

    // `installments` and `issuer` are required even though a monthly
    // subscription offers no choice in either: without them the SDK refuses to
    // mount at all, with 'Required field "installments" is missing'.
    for (const [field, target] of Object.entries(form)) {
      if (field === "id") continue;
      const id = typeof target === "string" ? target : target?.id;
      expect(document.getElementById(id!), `${field} points at #${id}`).not.toBeNull();
    }
    expect(Object.keys(form)).toContain("installments");
    expect(Object.keys(form)).toContain("issuer");
  });
});
