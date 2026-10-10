/**
 * The dashboard, rendered on the server as one HTML document.
 *
 * No framework and no external script: the page is read by a handful of
 * people, and every file it loads from somewhere else is one more thing that
 * could read the user list. Charts are inline SVG; the only script is the
 * table filter, allowed by a per-request nonce in the CSP.
 */
import type { Summary, UserRow } from "./metrics.js";

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const n = (value: number) => value.toLocaleString("en-US");
const date = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

function card(label: string, value: string, hint = ""): string {
  return `<div class="card"><p class="label">${escape(label)}</p><p class="value">${escape(value)}</p>${
    hint ? `<p class="hint">${escape(hint)}</p>` : ""
  }</div>`;
}

/** Bars for a 30-day series; the tallest bar sets the scale. */
function bars(title: string, series: { day: string; value: number }[]): string {
  const max = Math.max(1, ...series.map((point) => point.value));
  const width = 600;
  const height = 120;
  const step = width / series.length;
  const rects = series
    .map((point, i) => {
      const h = Math.round((point.value / max) * (height - 4));
      return `<rect x="${(i * step + 1).toFixed(1)}" y="${height - h}" width="${(step - 2).toFixed(1)}" height="${h}" rx="2"><title>${point.day}: ${point.value}</title></rect>`;
    })
    .join("");
  const total = series.reduce((sum, point) => sum + point.value, 0);
  return `<section class="panel"><div class="row"><h2>${escape(title)}</h2><span class="hint">${n(total)} in 30 days · max ${n(max)}/day</span></div>
  <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="chart" role="img" aria-label="${escape(title)}">${rects}</svg>
  <div class="row hint"><span>${series[0]?.day ?? ""}</span><span>${series.at(-1)?.day ?? ""}</span></div></section>`;
}

function breakdown(title: string, entries: Record<string, number>): string {
  const rows = Object.entries(entries).sort((a, b) => b[1] - a[1]);
  return `<section class="panel"><h2>${escape(title)}</h2>${
    rows.length === 0
      ? `<p class="hint">Nothing yet.</p>`
      : `<ul class="list">${rows.map(([key, value]) => `<li><span>${escape(key)}</span><b>${n(value)}</b></li>`).join("")}</ul>`
  }</section>`;
}

function funnel(steps: Summary["funnel"]): string {
  const top = Math.max(1, steps[0]?.count ?? 1);
  return `<section class="panel"><h2>Funnel</h2><ol class="funnel">${steps
    .map((step) => {
      const pct = Math.round((step.count / top) * 1000) / 10;
      return `<li><div class="row"><span>${escape(step.label)}</span><span><b>${n(step.count)}</b> <span class="hint">${pct}%</span></span></div><div class="track"><div class="fill" style="width:${Math.max(pct, 0.5)}%"></div></div></li>`;
    })
    .join("")}</ol></section>`;
}

function userRow(user: UserRow): string {
  const plan =
    user.plan === "premium"
      ? `<span class="pill premium">premium · ${escape(user.provider ?? user.source ?? "")}</span>`
      : `<span class="pill">free</span>`;
  return `<tr><td>${escape(user.email)}${user.google ? ` <span class="hint">Google</span>` : ""}</td><td>${plan}</td><td>${date(
    user.createdAt,
  )}</td><td>${user.verified ? "✓" : "—"}</td><td class="num">${n(user.completed)}</td><td>${date(user.lastAt)}</td></tr>`;
}

export function renderPage(summary: Summary, viewer: string, nonce: string): string {
  const { accounts, active, plans, subscriptions } = summary;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Mockio · Admin</title>
<style>
:root{--ink:#1d1d1f;--dim:#6e6e73;--ground:#f5f5f7;--panel:#fff;--line:#e5e5ea;--accent:#5856d6;--gold:#a16a00;--gold-soft:#fff4cc}
@media (prefers-color-scheme:dark){:root{--ink:#f5f5f7;--dim:#a1a1a6;--ground:#000;--panel:#1c1c1e;--line:#2c2c2e;--accent:#7d7aff;--gold:#ffcc00;--gold-soft:#3a2e08}}
*{box-sizing:border-box}body{margin:0;background:var(--ground);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:20px}
h1{font-size:26px;margin:0;letter-spacing:-.02em}h2{font-size:15px;margin:0}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:12px}
.two{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-bottom:12px}
.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px;min-width:0}
.label{margin:0;color:var(--dim);font-size:13px}.value{margin:4px 0 0;font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
.hint{color:var(--dim);font-size:13px}.row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.chart{width:100%;height:120px;margin:12px 0 4px;fill:var(--accent)}
.list{list-style:none;margin:12px 0 0;padding:0}.list li{display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)}
.funnel{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px}.track{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:4px}.fill{height:100%;background:var(--accent)}
.table{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px;border-top:1px solid var(--line);white-space:nowrap}th{color:var(--dim);font-weight:500;border-top:0}
.num{text-align:right;font-variant-numeric:tabular-nums}.pill{display:inline-block;padding:2px 8px;border-radius:99px;background:var(--line);font-size:12px}.pill.premium{background:var(--gold-soft);color:var(--gold);font-weight:600}
input{width:100%;max-width:320px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:var(--ground);color:var(--ink);font:inherit;margin:12px 0}
</style></head><body><main>
<header><h1>Mockio · Admin</h1><span class="hint">${escape(viewer)} · updated ${escape(summary.generatedAt.slice(0, 16).replace("T", " "))} UTC</span></header>
<div class="grid">
${card("Registered", n(accounts.total), `+${n(accounts.new7)} this week · +${n(accounts.new30)} in 30 days`)}
${card("Active · 7 days", n(active.d7), "started an interview")}
${card("Active · 30 days", n(active.d30), "started an interview")}
${card("Premium", n(plans.premium), `${n(plans.free)} on the free plan`)}
${card("Paying subscriptions", n(subscriptions.active), `${summary.paidConversion}% of accounts`)}
${card("Verified email", n(accounts.verified), `of ${n(accounts.total)}`)}
</div>
<div class="two">
${bars("Sign-ups per day", summary.signupsByDay.map((point) => ({ day: point.day, value: point.count })))}
${bars("Interviews finished per day", summary.interviewsByDay.map((point) => ({ day: point.day, value: point.completed })))}
</div>
<div class="two">
${funnel(summary.funnel)}
${breakdown("Premium by source", plans.bySource)}
${breakdown("Paying by provider", subscriptions.byProvider)}
${breakdown("Subscriptions by status", subscriptions.byStatus)}
</div>
<section class="panel"><div class="row"><h2>Users</h2><span class="hint">${n(summary.users.length)} · newest first</span></div>
<input id="filter" type="search" placeholder="Filter by email or plan" autocomplete="off">
<div class="table"><table><thead><tr><th>Email</th><th>Plan</th><th>Signed up</th><th>Verified</th><th class="num">Finished</th><th>Last interview</th></tr></thead>
<tbody id="users">${summary.users.map(userRow).join("")}</tbody></table></div></section>
<p class="hint">Revenue per subscription is not stored here; see the Paddle and Mercado Pago dashboards for amounts. Countries and the visit-to-sign-up funnel live in PostHog.</p>
</main>
<script nonce="${nonce}">
const input=document.getElementById("filter"),rows=[...document.querySelectorAll("#users tr")];
input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();for(const r of rows)r.hidden=q!==""&&!r.textContent.toLowerCase().includes(q);});
</script></body></html>`;
}
