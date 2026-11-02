/** Optional external support. No payment or entitlement is created here. */
export function supportConfig(env: NodeJS.ProcessEnv = process.env) {
  let url: string | null = null;
  try {
    const parsed = new URL(env.REALSESSIONS_SUPPORT_URL ?? "");
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) url = parsed.href;
  } catch { /* Unconfigured support must never produce a checkout link. */ }
  return { url, currency: "USD" as const, amounts: [1, 2, 5, 8, 10], frequencies: ["one-time", "monthly"], custom: true };
}

/** Legacy purchase endpoints are retired, including advisor packs and gifts. */
export function isRetiredPurchase(method: string | undefined, path: string): boolean {
  return method === "POST" && (
    ["/api/billing/subscribe", "/api/billing/checkout", "/api/billing/defense-pack"].includes(path)
    || /^\/api\/gift\/[\w-]+\/checkout$/.test(path)
  );
}
