import { useMemo } from "react";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice } from "@/lib/format";
import { convert, currencyName, formatApprox, visitorCurrency } from "@/lib/local-price";
import type { Rates } from "@/lib/local-price";

/**
 * A price as the reader understands it, and as their card is charged.
 *
 * Inside Peru it is one figure in soles, as before. Outside it, the headline
 * is an estimate in the reader's own currency — marked "≈", because a bank's
 * rate is not ours to promise — and a line underneath says exactly what is
 * charged and in what: "Your card is charged S/ 287.00 (Peruvian sol, PEN)".
 * Somebody about to spend money is told the number that will actually leave
 * their account, which is the rule every other line about money here follows.
 */
export function useLocalPrice(amount: number | undefined, currency: string | undefined, rates: Rates | null) {
  const { locale } = useLocale();
  const visitor = useMemo(() => visitorCurrency(), []);
  if (amount === undefined || !currency) return null;
  const local = convert(amount, currency, visitor, rates);
  return {
    /** The headline figure. */
    headline: local !== null && visitor ? `≈ ${formatApprox(local, visitor, locale)}` : formatPrice(amount, currency, locale),
    /** The same conversion, for another amount in the same currency (e.g. a month of a year). */
    format: (value: number) => {
      const converted = convert(value, currency, visitor, rates);
      return converted !== null && visitor
        ? `≈ ${formatApprox(converted, visitor, locale)}`
        : formatPrice(value, currency, locale);
    },
    /** What the card is charged, or null for a reader who already pays in it. */
    charged:
      visitor === currency
        ? null
        : {
            price: formatPrice(amount, currency, locale),
            name: currencyName(currency, locale),
            code: currency,
            estimated: local !== null,
          },
  };
}
