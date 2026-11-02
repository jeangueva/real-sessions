import { useEffect, useState } from "react";
import { Compass, ExternalLink } from "lucide-react";
import {
  Action,
  Eyebrow,
  FadeRise,
  Field,
  Notice,
  Panel,
} from "@/design-system";
import { Chip, IconTile, Inset, MonoLabel, Widget } from "@/components/marketing";
import { useLocale } from "@/hooks/useLocale";
import { PageBody, PageHeader } from "./AppShell";

export interface IntuitionCaseItem {
  id: string;
  kind: "prioritization" | "tradeoffs" | "hypotheses";
  title: string;
  prompt: string;
  options: string[];
}

interface RevealResponse {
  judgment: {
    caseId: string;
    choice: number;
    confidence: number;
    reasoning: string;
  };
  recommended: number;
  rationale: string;
  reveal: {
    name: string;
    outcome: string;
    source: string;
    url: string;
  };
  reflection: string;
  presentation: string;
}

const CASE_ES: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Actividad automatizada inesperada tras un despliegue",
    prompt: "Un sistema automatizado de transacciones acaba de recibir una actualización de software. Aparecen alertas antes de la apertura y comienza una actividad inesperada. ¿Qué priorizas primero?",
    options: [
      "Contener la actividad de inmediato y verificar la consistencia de las versiones desplegadas",
      "Esperar unos minutos para observar si el volumen se estabiliza solo",
      "Aumentar la capacidad de procesamiento para vaciar la cola más rápido",
    ],
  },
  "case-b": {
    title: "Recuperación tras una interrupción de red",
    prompt: "Un servicio sufrió una breve caída de red y los estados de las bases de datos divergieron. Puedes restaurar la disponibilidad rápido aceptando posibles inconsistencias o pausar escrituras mientras reconcilias los datos. ¿Qué enfoque eliges?",
    options: [
      "Reanudar todas las escrituras de inmediato",
      "Priorizar la integridad de los datos y comunicar una recuperación más gradual",
      "Asumir que la reconexión automática reparó la divergencia",
    ],
  },
  "case-c": {
    title: "Desfase entre dos equipos en una interfaz crítica",
    prompt: "Dos equipos intercambian datos numéricos para guiar un vehículo remoto. La trayectoria observada difiere de la predicción. ¿Qué hipótesis pruebas primero en la interfaz?",
    options: [
      "Las mediciones deben ser ruido aleatorio",
      "El vehículo tiene una falla mecánica interna",
      "Quien produce el dato y quien lo consume están interpretando las unidades de forma distinta",
    ],
  },
  "case-d": {
    title: "Fricción en el registro antes de pagar",
    prompt: "Muchos compradores abandonan el carrito justo después de pulsar el botón de pago, donde se les pide registrarse o iniciar sesión antes de completar la compra. ¿Qué hipótesis de producto pruebas primero?",
    options: [
      "Reemplazar el registro obligatorio previo al pago por compra como invitado y creación opcional de cuenta al finalizar",
      "Agregar más indicaciones de validación de contraseña en el formulario de registro",
      "Enviar un correo con descuento 24 horas después del abandono",
    ],
  },
  "case-e": {
    title: "Exceso de funciones frente al flujo con tracción real",
    prompt: "Tu aplicación móvil incluye insignias de juego, planes grupales y publicación de fotos, pero la retención está estancada y solo una función — compartir fotos con filtros — muestra tracción orgánica clara. ¿Cómo asignas el siguiente ciclo de producto?",
    options: [
      "Construir más recompensas sociales para levantar las funciones rezagadas",
      "Reenfocar el producto en el único flujo de fotos con señal fuerte y recortar el resto",
      "Mantener todas las funciones y rediseñar la barra de navegación",
    ],
  },
  "case-f": {
    title: "Alto tráfico y pocas reservas en un marketplace",
    prompt: "Los anuncios de alojamiento en una ciudad principal reciben visitas, pero las reservas siguen bajas. Al revisar las publicaciones, las fotos son oscuras y tomadas con teléfonos de baja resolución. ¿Qué priorizas esta semana?",
    options: [
      "Reescribir el algoritmo de ordenamiento de búsqueda",
      "Probar fotografía de alta calidad en una muestra de anuncios para verificar si la confianza visual es el cuello de botella",
      "Reducir la comisión de la plataforma en 2%",
    ],
  },
};

const CASE_FR: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Activité automatisée inattendue après un déploiement",
    prompt: "Un système automatisé de transactions vient de recevoir une mise à jour logicielle. Des alertes apparaissent avant l'ouverture et une activité inattendue commence. Que priorisez-vous en premier ?",
    options: [
      "Contenir immédiatement l'activité et vérifier la cohérence des versions déployées",
      "Attendre quelques minutes pour voir si le volume se stabilise seul",
      "Augmenter la capacité de traitement pour vider la file plus vite",
    ],
  },
  "case-b": {
    title: "Reprise après une coupure réseau",
    prompt: "Un service a subi une brève coupure réseau et les états des bases de données ont divergé. Vous pouvez restaurer la disponibilité rapidement en acceptant d'éventuelles incohérences ou suspendre les écritures pendant la réconciliation. Quelle approche choisissez-vous ?",
    options: [
      "Reprendre immédiatement toutes les écritures",
      "Prioriser l'intégrité des données et communiquer une reprise plus graduelle",
      "Supposer que la reconnexion automatique a réparé la divergence",
    ],
  },
  "case-c": {
    title: "Décalage entre deux équipes sur une interface critique",
    prompt: "Deux équipes échangent des données numériques pour guider un véhicule à distance. La trajectoire observée diffère de la prédiction. Quelle hypothèse testez-vous d'abord sur l'interface ?",
    options: [
      "Les mesures doivent être du bruit aléatoire",
      "Le véhicule a une défaillance mécanique interne",
      "Le producteur et le consommateur de la donnée interprètent les unités différemment",
    ],
  },
  "case-d": {
    title: "Friction d'inscription avant le paiement",
    prompt: "De nombreux acheteurs abandonnent leur panier juste après avoir cliqué sur le bouton de paiement, où on leur demande de s'inscrire ou de se connecter avant de finaliser l'achat. Quelle hypothèse produit testez-vous en premier ?",
    options: [
      "Remplacer l'inscription obligatoire avant paiement par un achat invité et une création de compte optionnelle après paiement",
      "Ajouter davantage d'indications de validation du mot de passe sur le formulaire",
      "Envoyer un e-mail de réduction 24 heures après l'abandon",
    ],
  },
  "case-e": {
    title: "Trop de fonctionnalités face au seul flux à forte traction",
    prompt: "Votre application mobile inclut des badges ludiques, des projets de groupe et le partage de photos, mais la rétention stagne et seule une fonctionnalité — le partage de photos avec filtres — montre une traction organique nette. Comment allouez-vous le prochain cycle produit ?",
    options: [
      "Construire davantage de récompenses sociales pour relancer les fonctionnalités en retard",
      "Recentrer le produit sur l'unique flux photo à fort signal et retirer le reste",
      "Conserver toutes les fonctionnalités et refondre la barre de navigation",
    ],
  },
  "case-f": {
    title: "Fort trafic et peu de réservations sur une place de marché",
    prompt: "Les annonces d'hébergement dans une grande ville reçoivent des visites, mais les réservations restent faibles. En examinant les annonces, les photos sont sombres et prises avec des téléphones basse résolution. Que priorisez-vous cette semaine ?",
    options: [
      "Réécrire l'algorithme de classement de recherche",
      "Tester des photos haute qualité sur un échantillon d'annonces pour vérifier si la confiance visuelle est le goulot d'étranglement",
      "Réduire la commission de la plateforme de 2 %",
    ],
  },
};

const CASE_PT: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Atividade automatizada inesperada após um deploy",
    prompt: "Um sistema automatizado de transações acabou de receber uma atualização de software. Alertas aparecem antes da abertura e começa uma atividade inesperada. O que você prioriza primeiro?",
    options: [
      "Conter a atividade imediatamente e verificar a consistência das versões implantadas",
      "Aguardar alguns minutos para observar se o volume se estabiliza sozinho",
      "Aumentar a capacidade de processamento para esvaziar a fila mais rápido",
    ],
  },
  "case-b": {
    title: "Recuperação após uma interrupção de rede",
    prompt: "Um serviço sofreu uma breve queda de rede e os estados dos bancos de dados divergiram. Você pode restaurar a disponibilidade rápido aceitando possíveis inconsistências ou pausar escritas enquanto reconcilia os dados. Qual abordagem escolhe?",
    options: [
      "Retomar todas as escritas imediatamente",
      "Priorizar a integridade dos dados e comunicar uma recuperação mais gradual",
      "Assumir que a reconexão automática reparou a divergência",
    ],
  },
  "case-c": {
    title: "Desalinhamento entre duas equipes em uma interface crítica",
    prompt: "Duas equipes trocam dados numéricos para guiar um veículo remoto. A trajetória observada difere da previsão. Qual hipótese você testa primeiro na interface?",
    options: [
      "As medições devem ser ruído aleatório",
      "O veículo tem uma falha mecânica interna",
      "Quem produz o dado e quem o consome estão interpretando as unidades de forma diferente",
    ],
  },
  "case-d": {
    title: "Fricção no cadastro antes do pagamento",
    prompt: "Muitos compradores abandonam o carrinho logo após clicar no botão de pagamento, onde são solicitados a criar conta ou entrar antes de concluir a compra. Qual hipótese de produto você testa primeiro?",
    options: [
      "Substituir o cadastro obrigatório antes do pagamento por compra como convidado e criação opcional de conta ao finalizar",
      "Adicionar mais dicas de validação de senha no formulário de cadastro",
      "Enviar um e-mail com desconto 24 horas após o abandono",
    ],
  },
  "case-e": {
    title: "Excesso de funcionalidades diante do fluxo com tração real",
    prompt: "Seu aplicativo móvel inclui medalhas de jogo, planos em grupo e publicação de fotos, mas a retenção está estagnada e apenas uma função — compartilhar fotos com filtros — mostra tração orgânica clara. Como você aloca o próximo ciclo de produto?",
    options: [
      "Construir mais recompensas sociais para levantar as funções atrasadas",
      "Refocar o produto no único fluxo de fotos com sinal forte e cortar o restante",
      "Manter todas as funções e redesenhar a barra de navegação",
    ],
  },
  "case-f": {
    title: "Alto tráfego e poucas reservas em um marketplace",
    prompt: "Os anúncios de hospedagem em uma cidade principal recebem visitas, mas as reservas continuam baixas. Ao revisar as publicações, as fotos são escuras e tiradas com celulares de baixa resolução. O que você prioriza nesta semana?",
    options: [
      "Reescrever o algoritmo de ordenação da busca",
      "Testar fotografia de alta qualidade em uma amostra de anúncios para verificar se a confiança visual é o gargalo",
      "Reduzir a comissão da plataforma em 2%",
    ],
  },
};

const COPY = {
  en: {
    title: "Deliberate intuition trainer",
    intro: "Commit to a product, design or systems decision, state your confidence and write your reasoning before revealing what actually happened in the documented historical case.",
    filterLabel: "Decision type",
    filterAll: "All cases",
    prioritization: "Prioritization",
    tradeoffs: "Trade-offs",
    hypotheses: "Hypotheses",
    stepCommit: "1. Commit your judgment before the reveal",
    optionsLegend: "Choose your course of action",
    confidenceLabel: "Confidence in this decision",
    reasoningLabel: "Why this option? What signal matters most, and what assumption could fail?",
    reasoningPlaceholder: "Write the signal you are relying on and what evidence would change your mind…",
    revealBtn: "Commit judgment and reveal outcome",
    revealingBtn: "Revealing documented case…",
    outcomeEyebrow: "Documented historical outcome",
    yourChoice: "Your committed choice",
    recommendedChoice: "Recommended approach",
    alignedBadge: "Aligned with documented lesson",
    differsBadge: "Different from documented lesson",
    rationaleHeading: "Why this approach holds up",
    sourceLabel: "Read primary source",
    nextCaseBtn: "Practice next case",
    loadingCases: "Loading intuition cases…",
  },
  es: {
    title: "Entrenador de intuición",
    intro: "Compromete tu decisión de priorización, trade-offs o hipótesis, registra tu nivel de confianza y explica tu razonamiento antes de revelar qué ocurrió realmente en el caso histórico documentado.",
    filterLabel: "Tipo de criterio",
    filterAll: "Todos los casos",
    prioritization: "Priorización",
    tradeoffs: "Trade-offs",
    hypotheses: "Hipótesis",
    stepCommit: "1. Compromete tu criterio antes de ver el desenlace",
    optionsLegend: "Elige tu decisión",
    confidenceLabel: "Nivel de confianza en tu decisión",
    reasoningLabel: "¿Por qué eliges esta opción? ¿Qué señal pesa más y qué supuesto podría fallar?",
    reasoningPlaceholder: "Escribe la señal principal en la que te apoyas y qué evidencia te haría cambiar de postura…",
    revealBtn: "Confirmar decisión y revelar caso real",
    revealingBtn: "Revelando caso documentado…",
    outcomeEyebrow: "Desenlace histórico documentado",
    yourChoice: "Tu decisión comprometida",
    recommendedChoice: "Enfoque recomendado",
    alignedBadge: "Alineado con la lección del caso",
    differsBadge: "Distinto al enfoque recomendado",
    rationaleHeading: "Por qué se sostiene este criterio",
    sourceLabel: "Consultar fuente original",
    nextCaseBtn: "Practicar siguiente caso",
    loadingCases: "Cargando casos de intuición…",
  },
  pt: {
    title: "Treinador de intuição",
    intro: "Registre sua decisão de priorização, trade-offs ou hipóteses, defina sua confiança e explique seu raciocínio antes de revelar o que realmente aconteceu no caso histórico documentado.",
    filterLabel: "Tipo de decisão",
    filterAll: "Todos os casos",
    prioritization: "Priorização",
    tradeoffs: "Trade-offs",
    hypotheses: "Hipóteses",
    stepCommit: "1. Registre seu julgamento antes da revelação",
    optionsLegend: "Escolha sua decisão",
    confidenceLabel: "Nível de confiança nesta decisão",
    reasoningLabel: "Por que esta opção? Qual sinal mais importa e qual suposição pode falhar?",
    reasoningPlaceholder: "Escreva o sinal principal em que você se apoia e que evidência mudaria sua decisão…",
    revealBtn: "Confirmar decisão e revelar caso real",
    revealingBtn: "Revelando caso documentado…",
    outcomeEyebrow: "Desfecho histórico documentado",
    yourChoice: "Sua escolha registrada",
    recommendedChoice: "Abordagem recomendada",
    alignedBadge: "Alinhado com a lição documentada",
    differsBadge: "Diferente da abordagem recomendada",
    rationaleHeading: "Por que esse critério se sustenta",
    sourceLabel: "Consultar fonte original",
    nextCaseBtn: "Praticar próximo caso",
    loadingCases: "Carregando casos de intuição…",
  },
  fr: {
    title: "Entraîneur d'intuition",
    intro: "Engagez votre décision de priorisation, de compromis ou d'hypothèse, indiquez votre niveau de confiance et expliquez votre raisonnement avant de révéler ce qui s'est réellement passé dans le cas historique documenté.",
    filterLabel: "Type de décision",
    filterAll: "Tous les cas",
    prioritization: "Priorisation",
    tradeoffs: "Compromis",
    hypotheses: "Hypothèses",
    stepCommit: "1. Engagez votre jugement avant la révélation",
    optionsLegend: "Choisissez votre plan d'action",
    confidenceLabel: "Niveau de confiance dans cette décision",
    reasoningLabel: "Pourquoi cette option ? Quel signal compte le plus et quelle hypothèse pourrait échouer ?",
    reasoningPlaceholder: "Décrivez le signal principal sur lequel vous vous appuyez et quelle preuve vous ferait changer d'avis…",
    revealBtn: "Valider le jugement et révéler le cas réel",
    revealingBtn: "Révélation du cas documenté…",
    outcomeEyebrow: "Issue historique documentée",
    yourChoice: "Votre choix engagé",
    recommendedChoice: "Approche recommandée",
    alignedBadge: "Aligné avec l'enseignement documenté",
    differsBadge: "Différent de l'approche recommandée",
    rationaleHeading: "Pourquoi cette approche tient la route",
    sourceLabel: "Lire la source primaire",
    nextCaseBtn: "Pratiquer le cas suivant",
    loadingCases: "Chargement des cas d'intuition…",
  },
} as const;

export function IntuitionTrainer() {
  const { locale } = useLocale();
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : locale === "fr" ? COPY.fr : COPY.en;

  const [cases, setCases] = useState<IntuitionCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | IntuitionCaseItem["kind"]>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(70);
  const [reasoning, setReasoning] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RevealResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/training/catalogue")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load intuition cases.");
        return (await res.json()) as { intuition: IntuitionCaseItem[] };
      })
      .then((data) => {
        if (!active) return;
        const list = data.intuition ?? [];
        setCases(list);
        if (list[0]) setSelectedId(list[0].id);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load cases.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredCases = cases.filter((c) => kindFilter === "all" || c.kind === kindFilter);
  const activeCase =
    filteredCases.find((c) => c.id === selectedId) ?? filteredCases[0] ?? cases[0] ?? null;

  function localizeCase(item: IntuitionCaseItem) {
    if (locale === "es" && CASE_ES[item.id]) return CASE_ES[item.id]!;
    if (locale === "fr" && CASE_FR[item.id]) return CASE_FR[item.id]!;
    if (locale === "pt" && CASE_PT[item.id]) return CASE_PT[item.id]!;
    return item;
  }

  function kindLabel(kind: IntuitionCaseItem["kind"]) {
    return kind === "prioritization"
      ? copy.prioritization
      : kind === "tradeoffs"
        ? copy.tradeoffs
        : copy.hypotheses;
  }

  function selectCase(id: string) {
    setSelectedId(id);
    setChoice(null);
    setReasoning("");
    setResult(null);
    setError(null);
  }

  async function handleReveal() {
    if (!activeCase || choice === null || !reasoning.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/training/intuition/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: activeCase.id,
          choice,
          confidence,
          reasoning: reasoning.trim(),
        }),
      });
      const body = (await res.json()) as RevealResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not reveal outcome.");
      setResult(body);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reveal outcome.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNextCase() {
    if (!filteredCases.length || !activeCase) return;
    const idx = filteredCases.findIndex((c) => c.id === activeCase.id);
    const next = filteredCases[(idx + 1) % filteredCases.length];
    if (next) selectCase(next.id);
  }

  const localizedActive = activeCase ? localizeCase(activeCase) : null;

  return (
    <main>
      <PageHeader
        title={copy.title}
        meta={copy.intro}
      />

      <PageBody className="space-y-6 pt-2">
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <Widget label="CASES" className="p-6">
            <p role="status" className="text-sm text-cream-dim">
              {copy.loadingCases}
            </p>
          </Widget>
        ) : (
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Left column: Filter + Case rail */}
            <div className="space-y-4 xl:col-span-4">
              <Widget label={copy.filterLabel} className="p-5">
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="sr-only">{copy.filterLabel}</legend>
                  {(
                    [
                      ["all", copy.filterAll],
                      ["prioritization", copy.prioritization],
                      ["tradeoffs", copy.tradeoffs],
                      ["hypotheses", copy.hypotheses],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={kindFilter === id}
                      onClick={() => {
                        setKindFilter(id);
                        const nextList = cases.filter((c) => id === "all" || c.kind === id);
                        if (nextList[0]) selectCase(nextList[0].id);
                      }}
                      className="focus-ring rounded-full border border-line bg-surface-base px-3.5 py-1.5 text-sm font-medium text-cream-bright transition-colors hover:border-line-bright aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              </Widget>

              <div className="space-y-2.5">
                {filteredCases.map((item, idx) => {
                  const loc = localizeCase(item);
                  const isSelected = activeCase?.id === item.id;
                  return (
                    <FadeRise key={item.id} delay={idx * 0.03}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => selectCase(item.id)}
                        className={`focus-ring flex w-full flex-col justify-between rounded-[1.25rem] border p-4 text-left transition-all ${
                          isSelected
                            ? "border-accent-border bg-surface-lift shadow-card"
                            : "border-line bg-surface-card hover:border-line-bright hover:bg-surface-lift"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <MonoLabel>#{String(idx + 1).padStart(2, "0")}</MonoLabel>
                          {/* The kind as words, not a chip. Six cases in a
                              narrow column used to carry six peach blocks
                              for one word each; the word is what the reader
                              needs and the colour was decoration. */}
                          <span className="text-xs text-cream-dim">{kindLabel(item.kind)}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium tracking-[-0.015em] text-cream-bright">
                          {loc.title}
                        </p>
                      </button>
                    </FadeRise>
                  );
                })}
              </div>
            </div>

            {/* Right column: Active case decision + Historical reveal */}
            <div className="space-y-6 xl:col-span-8">
              {activeCase && localizedActive && (
                <Widget
                  label={`${activeCase.id.toUpperCase()} · ${kindLabel(activeCase.kind)}`}
                  className="p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    <IconTile>
                      <Compass className="h-4 w-4" aria-hidden />
                    </IconTile>
                    <h2 className="text-xl font-medium tracking-[-0.025em] text-cream-bright sm:text-2xl">
                      {localizedActive.title}
                    </h2>
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-cream-dim">
                    {localizedActive.prompt}
                  </p>

                  <fieldset className="mt-5 space-y-2.5" disabled={Boolean(result)}>
                    <legend className="text-sm font-medium text-cream-bright">
                      {copy.optionsLegend}
                    </legend>
                    {localizedActive.options.map((opt, idx) => {
                      const checked = choice === idx;
                      return (
                        <label
                          key={idx}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
                            checked
                              ? "border-accent-border bg-accent-soft text-cream-bright"
                              : "border-line bg-surface-base text-cream-bright hover:bg-surface-lift"
                          }`}
                        >
                          <input
                            type="radio"
                            name="intuition-choice"
                            value={idx}
                            checked={checked}
                            onChange={() => setChoice(idx)}
                            className="mt-1 text-sm"
                          />
                          <span className="leading-relaxed">{opt}</span>
                        </label>
                      );
                    })}
                  </fieldset>

                  <Inset className="mt-5 p-4">
                    <label
                      htmlFor="confidence-range"
                      className="flex items-center justify-between text-sm font-medium text-cream-bright"
                    >
                      <span>{copy.confidenceLabel}</span>
                      <span className="font-mono text-accent-text">{confidence}%</span>
                    </label>
                    <input
                      id="confidence-range"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      disabled={Boolean(result)}
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="mt-3 w-full text-sm"
                    />
                    {/* No second meter. The slider already shows where the
                        value sits and the label already says what it is; the
                        bar underneath repeated both a third time. */}
                  </Inset>

                  <div className="mt-5">
                    <Field label={copy.reasoningLabel} htmlFor="intuition-reasoning">
                      <textarea
                        id="intuition-reasoning"
                        rows={3}
                        maxLength={2000}
                        disabled={Boolean(result)}
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder={copy.reasoningPlaceholder}
                        className="focus-ring mt-1 w-full rounded-xl border border-line bg-surface-base p-3.5 text-sm text-cream-bright"
                      />
                    </Field>
                  </div>

                  {!result && (
                    <div className="mt-5">
                      <Action
                        type="button"
                        withArrow
                        disabled={choice === null || !reasoning.trim() || submitting}
                        onClick={handleReveal}
                      >
                        {submitting ? copy.revealingBtn : copy.revealBtn}
                      </Action>
                    </div>
                  )}
                </Widget>
              )}

              {result && activeCase && localizedActive && (
                <Panel variant="raised" className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Eyebrow>{copy.outcomeEyebrow}</Eyebrow>
                    <Chip>
                      {result.judgment.choice === result.recommended
                        ? copy.alignedBadge
                        : copy.differsBadge}
                    </Chip>
                  </div>

                  <h3 className="mt-2.5 text-xl font-medium tracking-[-0.02em] text-cream-bright">
                    {result.reveal.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-cream-bright">
                    {result.reveal.outcome}
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Inset className="p-4">
                      <MonoLabel>
                        {copy.yourChoice} ({result.judgment.confidence}%)
                      </MonoLabel>
                      <p className="mt-2 text-sm font-medium text-cream-bright">
                        {localizedActive.options[result.judgment.choice]}
                      </p>
                    </Inset>
                    <Inset className="p-4">
                      <MonoLabel className="text-accent-text">{copy.recommendedChoice}</MonoLabel>
                      <p className="mt-2 text-sm font-medium text-cream-bright">
                        {localizedActive.options[result.recommended]}
                      </p>
                    </Inset>
                  </div>

                  <Inset className="mt-4 p-4">
                    <MonoLabel>{copy.rationaleHeading}</MonoLabel>
                    <p className="mt-2 text-sm leading-relaxed text-cream-dim">
                      {result.rationale}
                    </p>
                  </Inset>

                  <p className="mt-4 text-xs text-cream-dim">{result.reflection}</p>
                  <p className="mt-1 text-xs text-cream-faint">{result.presentation}</p>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <a
                      href={result.reveal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-accent-text underline underline-offset-4"
                    >
                      {copy.sourceLabel}: {result.reveal.source}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                    <Action type="button" withArrow onClick={handleNextCase}>
                      {copy.nextCaseBtn}
                    </Action>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}
      </PageBody>
    </main>
  );
}
