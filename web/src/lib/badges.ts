import type { MessageKey } from "./i18n";
import { EN_MESSAGES } from "./i18n";

/**
 * A badge's name and line in the reader's language.
 *
 * The server sends its English label and description with each badge; the
 * words now live here, keyed by the badge id, and the server's text is only
 * the fallback for a badge added there before it is added here.
 */
export function badgeText(
  t: (key: MessageKey) => string,
  badge: { id: string; label: string; description: string },
): { label: string; description: string } {
  const label = `badge.${badge.id}` as MessageKey;
  const body = `badge.${badge.id}.body` as MessageKey;
  return {
    label: label in EN_MESSAGES ? t(label) : badge.label,
    description: body in EN_MESSAGES ? t(body) : badge.description,
  };
}
