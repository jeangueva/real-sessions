import type { Area } from "./api";
import type { MessageKey } from "./i18n";

/**
 * An area's name in the reader's language.
 *
 * Role titles stay in English — they are the words on the job posting and in
 * the interview — but the headings that group them are interface, and read in
 * the interface's language. An area this build does not know keeps the
 * server's English label rather than showing nothing.
 */
const KEY: Record<string, MessageKey> = {
  engineering: "area.engineering",
  product: "area.product",
  design: "area.design",
  data: "area.data",
  growth: "area.growth",
  marketing: "area.marketing",
  finance: "area.finance",
  legal: "area.legal",
  people: "area.people",
  sales: "area.sales",
  "customer-success": "area.customerSuccess",
  operations: "area.operations",
};

export function areaLabel(t: (key: MessageKey) => string, area: Area): string {
  const key = KEY[area.id];
  return key ? t(key) : area.label;
}
