/** Copy shared by retired purchase surfaces; support never changes access. */
const COPY = {
  es: {
    title: "Mockio es gratis para todos",
    body: "Todas las herramientas y prácticas son gratuitas e ilimitadas. El apoyo es opcional y no desbloquea ventajas.",
    support: "Apoyar",
    start: "Empezar gratis",
    gift: "Ya no necesitas regalar un plan: comparte Mockio para practicar gratis.",
    affiliates: "Comparte la práctica, sin vender planes",
    affiliateBody: "Invita a tus estudiantes y acompaña su preparación. No hay paquetes de pago ni comisiones por nuevas compras.",
  },
  en: {
    title: "Mockio is free for everyone",
    body: "All tools and practice are free and unlimited. Support is optional and never unlocks advantages.",
    support: "Support",
    start: "Start for free",
    gift: "You no longer need to gift a plan: share Mockio to practise for free.",
    affiliates: "Share practice, without selling plans",
    affiliateBody: "Invite your students and follow their preparation. There are no paid packs or commissions on new purchases.",
  },
  pt: {
    title: "Mockio é grátis para todos",
    body: "Todas as ferramentas e práticas são gratuitas e ilimitadas. O apoio é opcional e não desbloqueia vantagens.",
    support: "Apoiar",
    start: "Começar grátis",
    gift: "Você não precisa mais presentear um plano: compartilhe o Mockio para praticar grátis.",
    affiliates: "Compartilhe a prática, sem vender planos",
    affiliateBody: "Convide seus alunos e acompanhe a preparação. Não há pacotes pagos nem comissões por novas compras.",
  },
};
export function freeAccessCopy(locale: string) {
  return COPY[locale as keyof typeof COPY] ?? COPY.es;
}
