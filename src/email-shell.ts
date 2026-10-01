/**
 * The frame every Mockio email is drawn in.
 *
 * Email is not the web, and most of what makes the product's own screens look
 * the way they do is unavailable here:
 *
 *   Layout      Tables, not flex or grid. Outlook renders through Word, which
 *               has never supported either.
 *   Styling     Inline on every element. A `<style>` block survives Gmail on
 *               the desktop and is stripped by Gmail on Android, so anything
 *               that matters cannot live in one.
 *   Typefaces   The system stack. A webfont is a network request a mail client
 *               refuses, and the fallback it lands on is the one everyone sees.
 *   Images      None. They arrive blocked by default, so a logo as an image is
 *               a grey box with alt text at the top of every message. The
 *               wordmark is set in type for the same reason the product's own
 *               is.
 *
 * What survives is the part that carries the brand anyway: a dark ground, warm
 * cream type, one accent of space and rule, and a voice that says the thing
 * plainly. The colours are stated rather than inherited — a client that paints
 * its own background behind a transparent message would otherwise put cream
 * text on white.
 *
 * Every message keeps its plain-text body. It is not a fallback nobody sees:
 * it is what a screen reader reads, what a terminal client shows, and what
 * lands when the HTML is stripped by a corporate filter — which is exactly the
 * sort of place a candidate reads mail about a job.
 */

/** The palette, fixed rather than themed: a mail client has no theme to ask. */
const INK = "#ece9d8";
const INK_DIM = "#a8a496";
const GROUND = "#17181c";
const PANEL = "#1f2126";
const LINE = "#2e3036";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface Shell {
  /** The line at the top, in large type. Not the subject — this is read second. */
  heading: string;
  /** Paragraphs, in order. Plain text; no markup is interpolated. */
  body: string[];
  /** The one thing to do, if there is one. */
  action?: { label: string; url: string };
  /** Small print under the rule: what to do if this was not you. */
  footnote?: string;
}

/**
 * Escapes text for HTML.
 *
 * Every string here comes from this codebase or from an address the person
 * typed, and an apostrophe in "we couldn't" would otherwise be fine while an
 * address containing `<` would not. Cheaper to escape everything than to
 * remember which is which.
 */
function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The HTML half of a message. */
export function shellHtml({ heading, body, action, footnote }: Shell): string {
  const paragraphs = body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK_DIM}">${escape(line)}</p>`,
    )
    .join("");

  // A button is a table, not an anchor with padding: Outlook ignores padding
  // on inline elements, which collapses it to underlined text.
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
         <tr><td style="background:${INK};border-radius:999px">
           <a href="${escape(action.url)}" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:15px;color:${GROUND};text-decoration:none">${escape(action.label)}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:${INK_DIM}">
         Or paste this into your browser:<br>
         <span style="color:${INK}">${escape(action.url)}</span>
       </p>`
    : "";

  const foot = footnote
    ? `<tr><td style="padding:20px 32px 28px;border-top:1px solid ${LINE}">
         <p style="margin:0;font-size:12px;line-height:1.6;color:${INK_DIM}">${escape(footnote)}</p>
       </td></tr>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:${GROUND};font-family:${FONT}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:${PANEL};border:1px solid ${LINE};border-radius:16px">
      <tr><td style="padding:28px 32px 0">
        <p style="margin:0;font-size:15px;letter-spacing:.04em;color:${INK};font-weight:600">mockio</p>
      </td></tr>
      <tr><td style="padding:20px 32px 0">
        <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:600;color:${INK}">${escape(heading)}</h1>
        ${paragraphs}
        ${button}
      </td></tr>
      ${foot}
    </table>
    <p style="margin:18px 0 0;font-size:11px;color:${INK_DIM}">Mockio · practise the interview in English</p>
  </td></tr>
</table>
</body></html>`;
}

/**
 * The plain-text half, from the same parts.
 *
 * Written from the shell rather than kept beside it so the two cannot drift:
 * a message whose text body says something the HTML does not is a message
 * somebody will eventually read the wrong half of.
 */
export function shellText({ heading, body, action, footnote }: Shell): string {
  const parts = [heading, "", ...body];
  if (action) parts.push("", action.url);
  if (footnote) parts.push("", footnote);
  return parts.join("\n");
}
