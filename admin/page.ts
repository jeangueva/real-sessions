/**
 * The admin's HTML: a shell with the sidebar and one empty frame per
 * section, plus the data as JSON. `client.js` draws everything from that
 * JSON, so a refresh after an action is one fetch and one redraw rather than
 * a page load. Styles and script are served from this service ('self' in the
 * CSP); nothing is loaded from anywhere else.
 */

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** JSON safe to place inside a <script> element. */
export function scriptJson(value: unknown): string {
  // "<" so a value cannot close the script element; the two line separators
  // because older engines read them as line ends inside a string.
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
}

/** Line icons, Lucide-style, defined once and referenced with <use>. */
const ICONS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></symbol>
<symbol id="i-funnel" viewBox="0 0 24 24"><path d="M3 4h18l-7 9v6l-4 2v-8z"/></symbol>
<symbol id="i-ticket" viewBox="0 0 24 24"><path d="M3 9a3 3 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a3 3 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M13 5v14" stroke-dasharray="2 2"/></symbol>
<symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></symbol>
<symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol>
<symbol id="i-panel" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 10l-2 2 2 2"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
<symbol id="i-out" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></symbol>
<symbol id="i-dots" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-crown" viewBox="0 0 24 24"><path d="M3 7l4 4 5-6 5 6 4-4-2 11H5z"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="i-edit" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
</svg>`;

/** The product mark, also served as this service's favicon. */
export const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#5856D6"/><path d="M36 27C50 25 56 39 48 48C48 41 44 38 36 38Z" fill="#EF9F27"/><path d="M20 21C19 13 23 8 30 7C27 11 28 15 32 18Z" fill="#fff"/><circle cx="28" cy="34" r="17" fill="#fff"/><circle cx="33" cy="29" r="3.6" fill="#26215C"/></svg>`;

const icon = (name: string) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const NAV: [string, string, string][] = [
  ["resumen", "home", "Resumen"],
  ["usuarios", "users", "Usuarios"],
  ["abandono", "funnel", "Embudo y abandono"],
  ["cupones", "ticket", "Cupones"],
  ["recomendaciones", "spark", "Recomendaciones"],
  ["actividad", "list", "Actividad"],
];

function head(): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Mockio · Admin</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"></head>`;
}

export function renderApp(payload: unknown, viewer: string): string {
  const nav = NAV.map(
    ([id, ic, label]) =>
      `<a href="#${id}">${icon(ic)}<span class="label">${label}</span>${
        id === "recomendaciones" ? `<span class="badge" id="insights-badge" hidden></span>` : ""
      }</a>`,
  ).join("");
  return `${head()}<body>${ICONS}
<div class="app">
  <aside class="side" aria-label="Secciones">
    <div class="brand">${MARK}<span class="brand-name">Mockio Admin</span></div>
    <nav class="nav">${nav}</nav>
    <div class="side-foot">
      <span class="who" title="${escape(viewer)}">${escape(viewer)}</span>
      <button class="btn collapse-btn" type="button" aria-label="Contraer menú">${icon("panel").replace('class="i"', 'class="i collapse-icon"')}<span class="label">Contraer</span></button>
      <form method="post" action="/logout"><button class="btn" type="submit" style="width:100%">${icon("out")}<span class="label">Cerrar sesión</span></button></form>
    </div>
  </aside>
  <div class="scrim"></div>
  <div style="min-width:0">
    <div class="topbar"><button class="btn ghost icon menu-btn" type="button" aria-label="Abrir menú">${icon("menu")}</button><span class="title">Resumen</span></div>
    <main>
      <section data-section="resumen">
        <div class="page-head"><div><h1>Resumen</h1><p class="dim small" id="updated"></p></div>
          <button class="btn" id="reload" type="button">${icon("refresh")}Actualizar</button></div>
        <div class="grid" id="overview-cards"></div>
        <div class="two">
          <div class="panel"><div class="row"><h2>Registros por día</h2><span class="dim small" id="signups-total"></span></div><div id="chart-signups"></div></div>
          <div class="panel"><div class="row"><h2>Entrevistas terminadas por día</h2><span class="dim small" id="interviews-total"></span></div><div id="chart-interviews"></div></div>
        </div>
        <div class="two">
          <div class="panel"><h2>Premium por origen</h2><div id="premium-sources"></div></div>
          <div class="panel"><h2>Pagando por pasarela</h2><div id="paying-providers"></div></div>
        </div>
      </section>

      <section data-section="usuarios" hidden>
        <div class="page-head"><div><h1>Usuarios</h1><p class="dim small" id="users-count"></p></div></div>
        <div class="toolbar">
          <input class="search" id="users-search" type="search" placeholder="Buscar por email o plan" autocomplete="off" aria-label="Buscar usuarios">
          <div class="seg" id="users-plan" role="group" aria-label="Filtrar por plan">
            <button type="button" data-plan="all" aria-pressed="true">Todos</button>
            <button type="button" data-plan="premium" aria-pressed="false">Premium</button>
            <button type="button" data-plan="free" aria-pressed="false">Gratis</button>
          </div>
        </div>
        <div class="table-wrap cards"><table><thead id="users-head"></thead><tbody id="users-body"></tbody></table></div>
      </section>

      <section data-section="abandono" hidden>
        <div class="page-head"><div><h1>Embudo y abandono</h1><p class="dim small">De registrarse a pagar, y dónde se quedan las entrevistas sin informe.</p></div></div>
        <div class="two">
          <div class="panel"><h2>Embudo</h2><div id="funnel"></div></div>
          <div class="panel"><div class="row"><h2>Hasta dónde llegaron</h2><span class="dim small" id="drop-total"></span></div><div id="drop-buckets"></div>
            <p class="dim small" style="margin-top:12px">Una entrevista cuenta como terminada cuando se genera el informe. "Respondieron todo" son entrevistas completas que nunca pidieron el informe: cerraron antes de pulsar Ver feedback, o la evaluación falló.</p></div>
        </div>
        <div class="grid" id="drop-cards"></div>
      </section>

      <section data-section="cupones" hidden>
        <div class="page-head"><div><h1>Cupones</h1><p class="dim small">Códigos que dan premium por unos días al canjearlos.</p></div>
          <button class="btn primary" id="new-coupon" type="button">${icon("plus")}Nuevo cupón</button></div>
        <div class="table-wrap cards"><table><thead><tr><th>Código</th><th>Estado</th><th class="r">Días</th><th>Usos</th><th>Vence</th><th></th></tr></thead><tbody id="coupons-body"></tbody></table></div>
      </section>

      <section data-section="recomendaciones" hidden>
        <div class="page-head"><div><h1>Recomendaciones</h1><p class="dim small">Revisiones automáticas sobre las métricas de hoy.</p></div>
          <button class="btn primary" id="ask-ai" type="button">${icon("spark")}Pedir análisis a la IA</button></div>
        <div class="insights" id="rules"></div>
        <div class="page-head" style="margin-top:28px"><div><h2>Análisis de la IA</h2><p class="dim small" id="ai-note">Lee solo cifras agregadas: nunca correos ni conversaciones.</p></div></div>
        <div class="insights" id="ai"></div>
      </section>

      <section data-section="actividad" hidden>
        <div class="page-head"><div><h1>Actividad</h1><p class="dim small">Cada cambio hecho desde este panel: quién, qué y a quién.</p></div></div>
        <div class="panel"><ul class="log" id="audit"></ul></div>
      </section>
    </main>
  </div>
</div>
<div class="menu" id="row-menu" role="menu" hidden>
  <button type="button" role="menuitem" data-action="grant">${icon("crown")}Dar premium…</button>
  <button type="button" role="menuitem" data-action="revoke" id="menu-revoke" class="danger">${icon("x")}Quitar premium…</button>
  <button type="button" role="menuitem" data-action="verify" id="menu-verify">${icon("check")}Marcar email verificado</button>
  <button type="button" role="menuitem" data-action="rename">${icon("edit")}Cambiar nombre…</button>
  <hr><button type="button" role="menuitem" data-action="copy">${icon("copy")}Copiar ID</button>
</div>
<dialog id="dialog"></dialog>
<div class="tip" role="tooltip"></div>
<div class="toasts" aria-live="polite"></div>
<script type="application/json" id="data">${scriptJson(payload)}</script>
<script src="/client.js" defer></script>
</body></html>`;
}

/** The two sign-in steps: ask for the address, then for the code. */
export function renderLogin(input: { step: "email" | "code"; email?: string; notice?: string }): string {
  const notice = input.notice ? `<p class="notice" role="status">${escape(input.notice)}</p>` : "";
  const form =
    input.step === "email"
      ? `<form method="post" action="/login"><div class="field"><label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="email" required autofocus></div>
<button class="btn primary" type="submit">Enviarme un código</button></form>`
      : `<form method="post" action="/verify"><input type="hidden" name="email" value="${escape(input.email ?? "")}">
<div class="field"><label for="code">Código de 6 dígitos enviado a ${escape(input.email ?? "")}</label>
<input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus></div>
<button class="btn primary" type="submit">Entrar</button></form>
<form method="get" action="/"><button class="linkbtn" type="submit">Usar otro email</button></form>`;
  return `${head()}<body><main class="login"><section class="panel"><div class="brand">${MARK}Mockio Admin</div>
<p class="dim small">Solo para el equipo.</p>${notice}${form}</section></main></body></html>`;
}
