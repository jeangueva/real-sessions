// Mockio admin — the interactive layer. Plain JavaScript, no build step: the
// server hands over the data as JSON in the page and this draws it, sorts it,
// and sends the few writes the admin can make.
(() => {
  "use strict";

  /** @type {any} */
  let data = JSON.parse(document.getElementById("data").textContent);
  const app = document.querySelector(".app");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Number(n).toLocaleString("es");
  const day = (iso) => (iso ? new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "—");
  const shortDay = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString("es", { day: "numeric", month: "short" });
  const icon = (name) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  /* ---------------------------------------------------------------------
   * Navigation: one section at a time, by hash. Switching is instant —
   * it happens dozens of times a session.
   * ------------------------------------------------------------------- */
  const SECTIONS = ["resumen", "usuarios", "abandono", "cupones", "recomendaciones", "actividad"];
  function show() {
    const id = SECTIONS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "resumen";
    for (const section of $$("[data-section]")) section.hidden = section.dataset.section !== id;
    for (const link of $$(".nav a")) {
      if (link.hash === `#${id}`) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    $(".topbar .title").textContent = $(`.nav a[href="#${id}"] .label`).textContent;
    app.classList.remove("open");
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", show);

  // Collapsed sidebar is remembered per browser.
  try {
    if (localStorage.getItem("admin.collapsed") === "1") app.classList.add("collapsed");
  } catch {}
  $(".collapse-btn").addEventListener("click", () => {
    app.classList.toggle("collapsed");
    try {
      localStorage.setItem("admin.collapsed", app.classList.contains("collapsed") ? "1" : "0");
    } catch {}
  });
  $(".menu-btn").addEventListener("click", () => app.classList.add("open"));
  $(".scrim").addEventListener("click", () => app.classList.remove("open"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      app.classList.remove("open");
      closeMenu();
    }
  });

  /* ---------------------------------------------------------------------
   * Tooltip: one element, positioned on the hovered bar. After the first
   * one, the next appears with no delay and no animation.
   * ------------------------------------------------------------------- */
  const tip = $(".tip");
  let tipTimer = 0;
  let tipOpen = false;
  let tipCloseTimer = 0;
  function placeTip(target) {
    const box = target.getBoundingClientRect();
    tip.textContent = target.dataset.tip;
    tip.style.left = `${Math.min(Math.max(box.left + box.width / 2, 80), innerWidth - 80)}px`;
    tip.style.top = `${box.top + Math.min(box.height, Math.max(0, box.height - (target.firstElementChild?.offsetHeight ?? 0)))}px`;
    $$(".bar.on").forEach((bar) => bar.classList.remove("on"));
    target.classList.add("on");
  }
  function openTip(target) {
    clearTimeout(tipCloseTimer);
    if (tipOpen) {
      tip.classList.add("instant");
      placeTip(target);
      return;
    }
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      tip.classList.remove("instant");
      placeTip(target);
      tip.classList.add("show");
      tipOpen = true;
    }, 120);
  }
  function closeTip() {
    clearTimeout(tipTimer);
    tipCloseTimer = setTimeout(() => {
      tip.classList.remove("show");
      tipOpen = false;
      $$(".bar.on").forEach((bar) => bar.classList.remove("on"));
    }, 80);
  }
  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-tip]");
    if (target && event.pointerType === "mouse") openTip(target);
  });
  document.addEventListener("pointerout", (event) => {
    if (event.target.closest("[data-tip]") && event.pointerType === "mouse") closeTip();
  });
  // Touch: a tap shows it, a tap elsewhere hides it.
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    const target = event.target.closest("[data-tip]");
    if (target) {
      tip.classList.add("instant");
      placeTip(target);
      tip.classList.add("show");
      tipOpen = true;
    } else closeTip();
  });

  /* ---------------------------------------------------------------------
   * Drawing
   * ------------------------------------------------------------------- */
  function bars(points, label) {
    const max = Math.max(1, ...points.map((p) => p.value));
    return `<div class="chart" role="img" aria-label="${esc(label)}">${points
      .map(
        (p) =>
          `<div class="bar" ${p.value === 0 ? "data-zero" : ""} data-tip="${esc(shortDay(p.day))} · ${fmt(p.value)} ${esc(
            p.unit,
          )}"><span style="height:${Math.max((p.value / max) * 100, p.value ? 3 : 1.5)}%"></span></div>`,
      )
      .join("")}</div><div class="axis"><span>${shortDay(points[0].day)}</span><span>${shortDay(points.at(-1).day)}</span></div>`;
  }

  function hbars(rows, total, tone = "") {
    const top = Math.max(1, total ?? Math.max(...rows.map((r) => r.count)));
    return `<div class="hbars">${rows
      .map((r) => {
        const pct = Math.round((r.count / top) * 1000) / 10;
        return `<div class="hbar ${r.tone ?? tone}" data-tip="${esc(r.label)}: ${fmt(r.count)} (${pct}%)"><div class="row"><span>${esc(
          r.label,
        )}</span><span class="num"><b>${fmt(r.count)}</b> <span class="dim small">${pct}%</span></span></div><div class="track"><div class="fill" style="width:${Math.max(
          pct,
          r.count ? 1 : 0,
        )}%"></div></div></div>`;
      })
      .join("")}</div>`;
  }

  const card = (label, value, hint, tipText) =>
    `<div class="card" ${tipText ? `data-tip="${esc(tipText)}"` : ""}><p class="label">${esc(label)}</p><p class="value">${esc(value)}</p>${
      hint ? `<p class="hint">${esc(hint)}</p>` : ""
    }</div>`;

  const SOURCE = { subscription: "Suscripción", manual: "Manual", forever: "Permanente", "early-access": "Acceso anticipado" };
  const sourceName = (s) => SOURCE[s] ?? (s?.startsWith("promo:") ? `Cupón ${s.slice(6)}` : s ?? "");

  function renderOverview() {
    const { accounts, active, plans, subscriptions, paidConversion } = data.summary;
    $("#overview-cards").innerHTML = [
      card("Registrados", fmt(accounts.total), `+${fmt(accounts.new7)} esta semana · +${fmt(accounts.new30)} en 30 días`),
      card("Activos · 7 días", fmt(active.d7), "empezaron una entrevista", `${Math.round((active.d7 / Math.max(1, accounts.total)) * 100)}% de los registrados`),
      card("Activos · 30 días", fmt(active.d30), "empezaron una entrevista", `${Math.round((active.d30 / Math.max(1, accounts.total)) * 100)}% de los registrados`),
      card("Premium", fmt(plans.premium), `${fmt(plans.free)} en el plan gratis`),
      card("Pagando", fmt(subscriptions.active), `${paidConversion}% de las cuentas`),
      card("Email verificado", fmt(accounts.verified), `de ${fmt(accounts.total)}`),
    ].join("");
    $("#chart-signups").innerHTML = bars(
      data.summary.signupsByDay.map((p) => ({ day: p.day, value: p.count, unit: p.count === 1 ? "registro" : "registros" })),
      "Registros por día",
    );
    $("#signups-total").textContent = `${fmt(data.summary.signupsByDay.reduce((t, p) => t + p.count, 0))} en 30 días`;
    $("#chart-interviews").innerHTML = bars(
      data.summary.interviewsByDay.map((p) => ({ day: p.day, value: p.completed, unit: p.completed === 1 ? "terminada" : "terminadas" })),
      "Entrevistas terminadas por día",
    );
    $("#interviews-total").textContent = `${fmt(data.summary.interviewsByDay.reduce((t, p) => t + p.completed, 0))} en 30 días`;
    const sources = Object.entries(plans.bySource).map(([k, v]) => ({ label: sourceName(k), count: v }));
    $("#premium-sources").innerHTML = sources.length ? hbars(sources, plans.premium) : `<p class="empty">Nadie con premium todavía.</p>`;
    const providers = Object.entries(subscriptions.byProvider).map(([k, v]) => ({ label: k === "mercadopago" ? "Mercado Pago" : k === "paddle" ? "Paddle" : k, count: v }));
    $("#paying-providers").innerHTML = providers.length ? hbars(providers) : `<p class="empty">Nadie paga todavía.</p>`;
  }

  const FUNNEL = ["Registrados", "Empezaron una entrevista", "Terminaron una", "Terminaron tres", "Pagando"];
  const BUCKETS = { none: "Sin responder nada", one: "1 respuesta", some: "2–3 respuestas", most: "4–6 respuestas", all: "Respondieron todo" };

  function renderDropOff() {
    const funnel = data.summary.funnel.map((step, i) => ({ label: FUNNEL[i] ?? step.label, count: step.count }));
    $("#funnel").innerHTML = hbars(funnel, funnel[0]?.count);
    const drop = data.summary.dropOff;
    $("#drop-total").textContent = `${fmt(drop.total)} sin informe`;
    $("#drop-buckets").innerHTML = drop.total
      ? hbars(
          drop.buckets.map((b) => ({ label: BUCKETS[b.key] ?? b.label, count: b.count, tone: b.key === "all" ? "warn" : "" })),
          drop.total,
        )
      : `<p class="empty">No hay entrevistas abandonadas.</p>`;
    $("#drop-cards").innerHTML = [
      card("Se fueron sin contestar", fmt(drop.leftWaiting), "el entrevistador habló último", "Suele ser el micrófono o el primer turno"),
      card("Hablaron", fmt(drop.spoke), "al menos una respuesta por voz"),
      card("Escribieron", fmt(drop.typed), "respondieron solo por texto"),
      card("Ya tenían otra terminada", fmt(drop.returning), "usuarios que vuelven", "Abandono de usuarios con experiencia, no de nuevos"),
      ...Object.entries(drop.byMode).map(([mode, n]) => card(mode === "real" ? "Modo real" : "Modo práctica", fmt(n), "entrevistas sin informe")),
    ].join("");
  }

  /* ---------------------------------------------------------------------
   * Users: filter, sort by any column, an actions menu per row.
   * ------------------------------------------------------------------- */
  const users = { query: "", plan: "all", key: "createdAt", dir: "desc" };
  const COLUMNS = [
    { key: "email", label: "Email" },
    { key: "plan", label: "Plan" },
    { key: "createdAt", label: "Registro" },
    { key: "verified", label: "Verificado" },
    { key: "completed", label: "Terminadas", right: true },
    { key: "lastAt", label: "Última entrevista" },
  ];
  function sortedUsers() {
    const q = users.query.trim().toLowerCase();
    const rows = data.summary.users.filter(
      (u) =>
        (users.plan === "all" || u.plan === users.plan) &&
        (!q || u.email.toLowerCase().includes(q) || sourceName(u.source).toLowerCase().includes(q)),
    );
    const dir = users.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const x = a[users.key] ?? "";
      const y = b[users.key] ?? "";
      if (typeof x === "number" || typeof x === "boolean") return (Number(x) - Number(y)) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }
  function renderUsers() {
    $("#users-head").innerHTML = `<tr>${COLUMNS.map(
      (c) =>
        `<th class="${c.right ? "r" : ""}" ${
          users.key === c.key ? `aria-sort="${users.dir === "asc" ? "ascending" : "descending"}"` : ""
        }><button type="button" data-sort="${c.key}">${esc(c.label)}<span class="arrow" aria-hidden="true">${
          users.key === c.key && users.dir === "asc" ? "▲" : "▼"
        }</span></button></th>`,
    ).join("")}<th><span class="sr-only">Acciones</span></th></tr>`;
    const rows = sortedUsers();
    $("#users-count").textContent = `${fmt(rows.length)} de ${fmt(data.summary.users.length)}`;
    $("#users-body").innerHTML = rows.length
      ? rows
          .map(
            (u) => `<tr data-id="${esc(u.id)}">
<td class="first" data-label="Email"><span class="email">${esc(u.email)}</span>${u.google ? ` <span class="pill">Google</span>` : ""}</td>
<td data-label="Plan">${
              u.plan === "premium"
                ? `<span class="pill premium">Premium · ${esc(u.provider === "mercadopago" ? "Mercado Pago" : u.provider === "paddle" ? "Paddle" : sourceName(u.source))}</span>`
                : `<span class="pill">Gratis</span>`
            }</td>
<td data-label="Registro">${day(u.createdAt)}</td>
<td data-label="Verificado">${u.verified ? `<span class="pill good">Sí</span>` : `<span class="pill bad">No</span>`}</td>
<td class="r num" data-label="Terminadas">${fmt(u.completed)}</td>
<td data-label="Última entrevista">${day(u.lastAt)}</td>
<td class="act"><button class="btn ghost icon" type="button" data-menu="${esc(u.id)}" aria-label="Acciones para ${esc(u.email)}">${icon("dots")}</button></td>
</tr>`,
          )
          .join("")
      : `<tr><td colspan="7" class="empty">Nadie coincide con el filtro.</td></tr>`;
  }
  $("#users-head").addEventListener("click", (event) => {
    const key = event.target.closest("[data-sort]")?.dataset.sort;
    if (!key) return;
    users.dir = users.key === key ? (users.dir === "asc" ? "desc" : "asc") : key === "email" ? "asc" : "desc";
    users.key = key;
    renderUsers();
  });
  $("#users-search").addEventListener("input", (event) => {
    users.query = event.target.value;
    renderUsers();
  });
  $("#users-plan").addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan]");
    if (!button) return;
    users.plan = button.dataset.plan;
    $$("#users-plan button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    renderUsers();
  });

  /* Row menu: opens from its button, scaling from the corner it grew out of. */
  const menu = $("#row-menu");
  let menuUser = null;
  function openMenu(button) {
    menuUser = data.summary.users.find((u) => u.id === button.dataset.menu);
    if (!menuUser) return;
    $("#menu-revoke").hidden = menuUser.plan !== "premium";
    $("#menu-verify").hidden = menuUser.verified;
    menu.hidden = false;
    const box = button.getBoundingClientRect();
    const below = box.bottom + menu.offsetHeight + 8 < innerHeight;
    menu.style.left = `${Math.max(8, Math.min(box.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${below ? box.bottom + 6 : box.top - menu.offsetHeight - 6}px`;
    menu.style.setProperty("--origin", below ? "top right" : "bottom right");
    requestAnimationFrame(() => menu.classList.add("show"));
    menu.querySelector("button:not([hidden])").focus();
  }
  function closeMenu() {
    if (menu.hidden) return;
    menu.classList.remove("show");
    setTimeout(() => {
      if (!menu.classList.contains("show")) menu.hidden = true;
    }, 150);
  }
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-menu]");
    if (trigger) {
      event.stopPropagation();
      if (!menu.hidden && menuUser?.id === trigger.dataset.menu) return closeMenu();
      return openMenu(trigger);
    }
    if (!menu.contains(event.target)) closeMenu();
  });
  window.addEventListener("scroll", closeMenu, { passive: true });

  menu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action || !menuUser) return;
    closeMenu();
    const user = menuUser;
    if (action === "copy") {
      navigator.clipboard?.writeText(user.id).then(() => toast("ID copiado."));
      return;
    }
    if (action === "verify") {
      return confirmDialog({
        title: "Marcar email como verificado",
        body: `${user.email} podrá recibir recordatorios y recibos.`,
        confirm: "Verificar",
        run: () => post("/api/users/verify", { userId: user.id }),
      });
    }
    if (action === "grant") {
      return formDialog({
        title: "Dar premium",
        subtitle: user.email,
        fields: [
          { name: "days", label: "Días", type: "number", value: "30", help: "Vacío = sin fecha de fin.", attrs: 'min="1" max="1825"' },
          { name: "note", label: "Motivo (queda en el registro)", type: "text", attrs: 'maxlength="200"' },
        ],
        confirm: "Dar premium",
        run: (v) => post("/api/users/grant", { userId: user.id, days: v.days, note: v.note }),
      });
    }
    if (action === "revoke") {
      return formDialog({
        title: "Quitar premium",
        subtitle: `${user.email} pierde el acceso premium ahora. Si paga una suscripción, también hay que cancelarla en la pasarela.`,
        fields: [{ name: "note", label: "Motivo (queda en el registro)", type: "text", attrs: 'maxlength="200"' }],
        confirm: "Quitar premium",
        danger: true,
        run: (v) => post("/api/users/revoke", { userId: user.id, note: v.note }),
      });
    }
    if (action === "rename") {
      return formDialog({
        title: "Cambiar nombre",
        subtitle: `${user.email} · el nombre con el que lo saluda el entrevistador`,
        fields: [{ name: "name", label: "Nombre", type: "text", attrs: 'maxlength="60" autocomplete="off"' }],
        confirm: "Guardar",
        run: (v) => post("/api/users/rename", { userId: user.id, name: v.name }),
      });
    }
  });

  /* ---------------------------------------------------------------------
   * Coupons
   * ------------------------------------------------------------------- */
  function couponState(c) {
    if (c.expiresAt && new Date(c.expiresAt) <= new Date()) return `<span class="pill">Desactivado</span>`;
    if (c.redeemed >= c.cap) return `<span class="pill">Agotado</span>`;
    return `<span class="pill good">Activo</span>`;
  }
  function renderCoupons() {
    $("#coupons-body").innerHTML = data.summary.coupons.length
      ? data.summary.coupons
          .map((c) => {
            const live = !(c.expiresAt && new Date(c.expiresAt) <= new Date()) && c.redeemed < c.cap;
            const pct = Math.round((c.redeemed / c.cap) * 100);
            return `<tr>
<td class="first" data-label="Código"><b>${esc(c.code)}</b></td>
<td data-label="Estado">${couponState(c)}</td>
<td class="r num" data-label="Días">${fmt(c.grantDays)}</td>
<td data-label="Usos" data-tip="${fmt(c.redeemed)} de ${fmt(c.cap)} usados (${pct}%)"><div class="hbar"><span class="num small">${fmt(c.redeemed)} / ${fmt(
              c.cap,
            )}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div></div></td>
<td data-label="Vence">${c.expiresAt ? day(c.expiresAt) : "Sin fecha"}</td>
<td class="act">${
              `<span style="display:inline-flex;gap:4px"><button class="btn ghost small" type="button" data-days="${esc(c.code)}" data-current="${c.grantDays}">Cambiar días</button>${
                live ? `<button class="btn ghost small" type="button" data-disable="${esc(c.code)}">Desactivar</button>` : ""
              }</span>`
            }</td></tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="empty">Todavía no hay cupones.</td></tr>`;
  }
  $("#new-coupon").addEventListener("click", () =>
    formDialog({
      title: "Nuevo cupón",
      subtitle: "Quien lo canjee recibe premium por los días que indiques.",
      fields: [
        { name: "code", label: "Código", type: "text", help: "3–32 letras, números o guiones. Se guarda en mayúsculas.", attrs: 'maxlength="32" autocomplete="off" required style="text-transform:uppercase"' },
        { name: "grantDays", label: "Días de premium", type: "number", value: "30", attrs: 'min="1" max="1825" required' },
        { name: "cap", label: "Usos máximos", type: "number", value: "100", attrs: 'min="1" max="100000" required' },
        { name: "expiresAt", label: "El código deja de funcionar el", type: "date", help: "Opcional." },
      ],
      confirm: "Crear cupón",
      run: (v) => post("/api/coupons", v),
    }),
  );
  $("#coupons-body").addEventListener("click", (event) => {
    const daysButton = event.target.closest("[data-days]");
    if (daysButton) {
      const code = daysButton.dataset.days;
      return formDialog({
        title: `Duración de ${code}`,
        subtitle: "Cuántos días de premium da al canjearlo.",
        fields: [
          { name: "days", label: "Días de premium", type: "number", value: daysButton.dataset.current, attrs: 'min="1" max="1825" required' },
          { name: "extend", label: "Aplicar también a quienes ya lo canjearon (contando desde su canje)", type: "checkbox", value: "on" },
        ],
        confirm: "Guardar",
        run: (v) => post("/api/coupons/days", { code, days: v.days, extend: v.extend === "on" }),
      });
    }
    const code = event.target.closest("[data-disable]")?.dataset.disable;
    if (!code) return;
    confirmDialog({
      title: `Desactivar ${code}`,
      body: "Deja de funcionar ahora. Quien ya lo canjeó conserva sus días.",
      confirm: "Desactivar",
      danger: true,
      run: () => post("/api/coupons/disable", { code }),
    });
  });

  /* ---------------------------------------------------------------------
   * Recommendations and activity
   * ------------------------------------------------------------------- */
  const SEVERITY = { high: "Alta", medium: "Media", low: "Baja" };
  const insightHtml = (list) =>
    list.length
      ? list
          .map(
            (i) => `<article class="panel insight"><div class="row"><span class="pill ${esc(i.severity)}">${esc(SEVERITY[i.severity] ?? i.severity)}</span><span class="dim small">${esc(
              i.area,
            )}</span></div><h2>${esc(i.title)}</h2><p class="dim">${esc(i.detail)}</p><p class="action"><b>Qué hacer:</b> ${esc(i.action)}</p></article>`,
          )
          .join("")
      : `<p class="empty">Nada urgente con los datos de hoy.</p>`;
  function renderInsights() {
    $("#rules").innerHTML = insightHtml(data.insights);
    const high = data.insights.filter((i) => i.severity === "high").length;
    const badge = $("#insights-badge");
    badge.hidden = high === 0;
    badge.textContent = String(high);
  }
  $("#ask-ai").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    busy(button, true);
    try {
      const result = await request("/api/insights/ai", {});
      $("#ai").innerHTML = insightHtml(result.insights);
      $("#ai-note").textContent = `Análisis de ${result.model} · ${new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
      toast(error.message, true);
    } finally {
      busy(button, false);
    }
  });

  const ACTION = { grant: "Dio premium", revoke: "Quitó premium", verify: "Verificó email", rename: "Cambió nombre", "coupon.create": "Creó cupón", "coupon.disable": "Desactivó cupón", "coupon.days": "Cambió la duración" };
  function renderAudit() {
    $("#audit").innerHTML = data.summary.audit.length
      ? data.summary.audit
          .map((a) => {
            const detail = Object.entries(a.detail ?? {})
              .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length))
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join(" · ");
            return `<li><span class="dim small">${new Date(a.at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}</span><span><b>${esc(
              ACTION[a.action] ?? a.action,
            )}</b> · ${esc(a.target)}<br><span class="dim small">${esc(a.actor)}${detail ? ` · ${esc(detail)}` : ""}</span></span></li>`;
          })
          .join("")
      : `<li class="empty">Todavía no hay acciones registradas.</li>`;
  }

  /* ---------------------------------------------------------------------
   * Dialogs, requests, toasts
   * ------------------------------------------------------------------- */
  const dialog = $("#dialog");
  function formDialog({ title, subtitle, fields = [], confirm, danger, run }) {
    dialog.innerHTML = `<form method="dialog" novalidate><h3>${esc(title)}</h3>${subtitle ? `<p class="dim small">${esc(subtitle)}</p>` : ""}${fields
      .map(
        (f) =>
          f.type === "checkbox"
            ? `<label class="check"><input id="f-${f.name}" name="${f.name}" type="checkbox" value="on"> <span>${esc(f.label)}</span></label>`
            : `<div class="field"><label for="f-${f.name}">${esc(f.label)}</label><input id="f-${f.name}" name="${f.name}" type="${f.type}" value="${esc(
                f.value ?? "",
              )}" ${f.attrs ?? ""}>${f.help ? `<span class="help">${esc(f.help)}</span>` : ""}</div>`,
      )
      .join("")}<p class="err" role="alert" hidden></p><div class="actions"><button class="btn" type="button" data-cancel>Cancelar</button><button class="btn ${
      danger ? "danger" : "primary"
    }" type="submit">${esc(confirm)}</button></div></form>`;
    const form = $("form", dialog);
    $("[data-cancel]", dialog).addEventListener("click", () => dialog.close());
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const button = $("[type=submit]", form);
      const err = $(".err", form);
      busy(button, true);
      try {
        const result = await run(values);
        dialog.close();
        toast(result.message);
        await refresh();
      } catch (error) {
        err.hidden = false;
        err.textContent = error.message;
      } finally {
        busy(button, false);
      }
    });
    dialog.showModal();
    $("input", dialog)?.focus();
  }
  const confirmDialog = ({ title, body, confirm, danger, run }) => formDialog({ title, subtitle: body, confirm, danger, run });

  function busy(button, on) {
    button.disabled = on;
    if (on) {
      button.dataset.label = button.innerHTML;
      button.innerHTML = `<span class="busy" aria-hidden="true"></span>${button.textContent}`;
    } else if (button.dataset.label) button.innerHTML = button.dataset.label;
  }

  async function request(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) location.reload();
    if (!response.ok) throw new Error(result.error ?? "No se pudo completar.");
    return result;
  }
  const post = request;

  async function refresh() {
    const response = await fetch("/api/data", { credentials: "same-origin" });
    if (response.ok) {
      data = await response.json();
      render();
    }
  }

  function toast(message, error = false) {
    const el = document.createElement("div");
    el.className = `toast${error ? " error" : ""}`;
    el.setAttribute("role", error ? "alert" : "status");
    el.textContent = message;
    $(".toasts").append(el);
    let timer = setTimeout(leave, error ? 7000 : 4500);
    // Paused while the pointer rests on it, or the tab is hidden.
    el.addEventListener("pointerenter", () => clearTimeout(timer));
    el.addEventListener("pointerleave", () => (timer = setTimeout(leave, 2000)));
    function leave() {
      if (document.hidden) return (timer = setTimeout(leave, 1000));
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 200);
    }
  }

  function render() {
    renderOverview();
    renderDropOff();
    renderUsers();
    renderCoupons();
    renderInsights();
    renderAudit();
    $("#updated").textContent = `Actualizado ${new Date(data.summary.generatedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
  }

  $("#reload").addEventListener("click", async (event) => {
    busy(event.currentTarget, true);
    await request("/api/refresh", {}).catch(() => undefined);
    await refresh();
    busy(event.currentTarget, false);
    toast("Datos actualizados.");
  });

  render();
  show();
})();
