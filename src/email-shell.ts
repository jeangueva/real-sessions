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
 *   Images      One: the mark, on a cell painted its own indigo, so a client
 *               that blocks images shows a tile, not a grey box. The name
 *               beside it is set in type and carries the brand regardless.
 *
 * What survives is the part that carries the brand anyway — and it is the
 * product's own look: Apple's light ground (#F5F5F7) with a white card on it,
 * near-black ink, one indigo pill for the one thing to do, and the wordmark
 * beside a small indigo tile set in type. The first version was a dark card
 * with cream type, the product's old palette; it now matches the screen the
 * button opens, so following the link does not feel like arriving somewhere
 * else. The colours are stated rather than inherited — a client that paints
 * its own background behind a transparent message would otherwise put the
 * ink on whatever it chose.
 *
 * Every message keeps its plain-text body. It is not a fallback nobody sees:
 * it is what a screen reader reads, what a terminal client shows, and what
 * lands when the HTML is stripped by a corporate filter — which is exactly the
 * sort of place a candidate reads mail about a job.
 */

/** The palette, fixed rather than themed: a mail client has no theme to ask. */
const INK = "#1d1d1f";
const INK_DIM = "#6e6e73";
const GROUND = "#f5f5f7";
const PANEL = "#ffffff";
const LINE = "#e5e5ea";
/** The accent, and the ink that sits on it — the product's #5856D6. */
const ACCENT = "#5856d6";
const ACCENT_INK = "#ffffff";

/** The mark as a PNG, from the product's own site (absolute: mail has no base URL). */
const MARK_URL = `${(process.env.REALSESSIONS_SITE_URL ?? "https://www.getmockio.com").replace(/\/$/, "")}/mark-email.png`;

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK_DIM}">${escape(line)}</p>`,
    )
    .join("");

  // A button is a table, not an anchor with padding: Outlook ignores padding
  // on inline elements, which collapses it to underlined text.
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 28px">
         <tr><td style="background:${ACCENT};border-radius:999px">
           <a href="${escape(action.url)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:600;letter-spacing:-0.01em;color:${ACCENT_INK};text-decoration:none">${escape(action.label)}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 28px;font-size:13px;line-height:1.6;color:${INK_DIM}">
         Or paste this into your browser:<br>
         <a href="${escape(action.url)}" style="color:${ACCENT};text-decoration:none;word-break:break-all">${escape(action.url)}</a>
       </p>`
    : "";

  const foot = footnote
    ? `<tr><td style="padding:22px 40px 32px;border-top:1px solid ${LINE}">
         <p style="margin:0;font-size:13px;line-height:1.6;color:${INK_DIM}">${escape(footnote)}</p>
       </td></tr>`
    : "";

  // The mark: Mocki on its indigo tile, then the name. The image sits on a
  // cell painted the same indigo, so a client that blocks images shows the
  // tile rather than a broken-image box — the name beside it carries the
  // brand either way.
  const mark = `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="28" height="28" style="width:28px;height:28px;background:${ACCENT};border-radius:8px;line-height:0"><img src="${MARK_URL}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;border-radius:8px"></td>
            <td style="padding-left:10px;font-size:17px;font-weight:600;letter-spacing:-0.02em;color:${INK}">mockio</td>
          </tr>
        </table>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:${GROUND};font-family:${FONT};-webkit-font-smoothing:antialiased">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND}">
  <tr><td align="center" style="padding:40px 16px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px">
      <tr><td style="padding:0 8px 20px">${mark}</td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:${PANEL};border:1px solid ${LINE};border-radius:20px">
      <tr><td style="padding:36px 40px 4px">
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${INK}">${escape(heading)}</h1>
        ${paragraphs}
        ${button}
      </td></tr>
      ${foot}
    </table>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${INK_DIM}">Mockio · practise the interview in English</p>
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
