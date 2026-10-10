/**
 * What to look at next.
 *
 * Two layers. `ruleInsights` is a handful of fixed checks against the
 * numbers — always there, free, and explainable line by line. `aiInsights`
 * asks a model to read the same numbers and say what it would do; it is run
 * on request only, because it costs money and its answer is an opinion.
 *
 * The model sees aggregates and nothing else: counts, rates, buckets. No
 * email, no id, no transcript. A recommendation does not need to know who.
 */
import { resolveProvider } from "../src/providers/index.js";
import type { Summary } from "./metrics.js";

export type Severity = "high" | "medium" | "low";

export interface Insight {
  severity: Severity;
  area: string;
  title: string;
  detail: string;
  action: string;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export function ruleInsights(summary: Summary): Insight[] {
  const out: Insight[] = [];
  const [registered, started, finishedOne, finishedThree, paying] = summary.funnel.map((step) => step.count) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const drop = summary.dropOff;
  const bucket = (key: string) => drop.buckets.find((entry) => entry.key === key)?.count ?? 0;

  if (registered >= 5 && pct(started, registered) < 60) {
    out.push({
      severity: "high",
      area: "Activación",
      title: `Solo ${pct(started, registered)}% de los registrados empieza una entrevista`,
      detail: `${registered - started} cuentas nunca pulsaron Empezar.`,
      action:
        "Envía un correo al día siguiente del registro con un enlace directo a una entrevista de 3 turnos, y revisa que el botón Empezar se vea sin hacer scroll en móvil.",
    });
  }

  if (drop.total >= 3) {
    if (bucket("all") / drop.total >= 0.25) {
      out.push({
        severity: "high",
        area: "Informe",
        title: `${bucket("all")} entrevistas completas nunca generaron informe`,
        detail: "Respondieron todas las preguntas pero el informe no se pidió: cerraron antes de pulsar Ver feedback, o la evaluación falló.",
        action: "Generar el informe automáticamente en el servidor al terminar el último turno, y llevar al informe sin pedir un clic.",
      });
    }
    if (bucket("none") / drop.total >= 0.3) {
      out.push({
        severity: "high",
        area: "Entrevista",
        title: `${bucket("none")} entrevistas se abandonaron sin responder nada`,
        detail: `${drop.leftWaiting} terminaron con el entrevistador hablando: la persona no llegó a contestar.`,
        action:
          "Revisar el permiso del micrófono y el primer turno: una prueba de micrófono antes de empezar, y la opción de escribir visible desde el inicio.",
      });
    }
    if ((bucket("some") + bucket("most")) / drop.total >= 0.3) {
      out.push({
        severity: "medium",
        area: "Entrevista",
        title: `${bucket("some") + bucket("most")} entrevistas se cortaron a mitad`,
        detail: "Respondieron varias preguntas y se fueron antes del final.",
        action: "Probar entrevistas más cortas por defecto (5 turnos) y mostrar el progreso \"pregunta 3 de 5\" más visible.",
      });
    }
  }

  if (started >= 5 && pct(finishedThree, finishedOne || 1) < 30 && finishedOne >= 3) {
    out.push({
      severity: "medium",
      area: "Retención",
      title: `Pocos vuelven: ${finishedThree} de ${finishedOne} llegan a 3 entrevistas`,
      detail: "La primera entrevista no se convierte en hábito.",
      action: "Recordatorio de racha por correo a las 24 h y una misión semanal visible desde el informe.",
    });
  }

  if (registered >= 10 && paying === 0) {
    out.push({
      severity: "medium",
      area: "Ingresos",
      title: "Nadie paga todavía",
      detail: `${summary.plans.premium} cuentas tienen premium, casi todas por cupón o regalo.`,
      action:
        "Antes de que venzan los cupones, avisa por correo 7 días antes con el precio regional y lo que se pierde; mide cuántos convierten.",
    });
  }

  if (registered >= 5 && pct(summary.accounts.verified, registered) < 70) {
    out.push({
      severity: "low",
      area: "Cuentas",
      title: `${registered - summary.accounts.verified} cuentas sin email verificado`,
      detail: "Sin verificar, los recordatorios y recibos pueden no llegar.",
      action: "Reenvía el correo de verificación desde aquí o revisa que no caiga en spam (SPF/DKIM de Resend).",
    });
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** The aggregates the model is allowed to see. */
export function aggregatesFor(summary: Summary) {
  return {
    accounts: summary.accounts,
    active: summary.active,
    plans: { premium: summary.plans.premium, free: summary.plans.free, bySource: summary.plans.bySource },
    subscriptions: { active: summary.subscriptions.active, byProvider: summary.subscriptions.byProvider },
    funnel: summary.funnel,
    dropOff: summary.dropOff,
    signupsLast30Days: summary.signupsByDay.reduce((total, day) => total + day.count, 0),
    interviewsFinishedLast30Days: summary.interviewsByDay.reduce((total, day) => total + day.completed, 0),
    coupons: summary.coupons.map((coupon) => ({ grantDays: coupon.grantDays, cap: coupon.cap, redeemed: coupon.redeemed })),
  };
}

const SYSTEM = `You advise the founder of Mockio, an app where people practise job interviews in English with an AI interviewer (voice), get a report, and can pay for premium (regional pricing, from US$1.99 to US$4.99 a month; S/ 9.90 in Peru). Users are mostly Latin American job seekers.

You get aggregate product metrics as JSON. Reply in Spanish, as JSON only:
{"insights":[{"severity":"high|medium|low","area":"...","title":"...","detail":"...","action":"..."}]}

Rules: at most 6 insights, most important first. Each title states the problem with the number that shows it. "detail" explains the likely cause in one or two sentences. "action" is one concrete thing to build or try this week, specific to this product. Do not invent numbers that are not in the data. If the sample is too small to conclude something, say so in that insight.`;

export async function aiInsights(summary: Summary, model: string): Promise<Insight[]> {
  const provider = resolveProvider(model);
  const response = await provider.chat({
    model,
    system: SYSTEM,
    messages: [{ role: "user", text: JSON.stringify(aggregatesFor(summary)) }],
    maxTokens: 1800,
  });
  const text = response.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { insights?: Insight[] };
  return (parsed.insights ?? [])
    .filter((entry) => entry && typeof entry.title === "string")
    .slice(0, 6)
    .map((entry) => ({
      severity: (["high", "medium", "low"] as const).includes(entry.severity) ? entry.severity : "medium",
      area: String(entry.area ?? "").slice(0, 40),
      title: String(entry.title).slice(0, 200),
      detail: String(entry.detail ?? "").slice(0, 600),
      action: String(entry.action ?? "").slice(0, 600),
    }));
}
