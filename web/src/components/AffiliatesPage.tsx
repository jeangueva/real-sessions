import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { useLocale } from "@/hooks/useLocale";
import { freeAccessCopy } from "@/lib/free-access-copy";

/** Retains the public URL for teachers who shared it before access became free. */
export function AffiliatesPage() {
  const { locale } = useLocale();
  const copy = freeAccessCopy(locale);
  useEffect(() => { document.title = `${copy.affiliates} · Mockio`; }, [copy.affiliates]);
  return (
    <>
      <LandingNav />
      <main className="mx-auto flex min-h-[65vh] max-w-4xl flex-col justify-center gap-6 px-6 py-24">
        <h1 className="text-balance text-4xl tracking-tight text-cream-bright sm:text-5xl">{copy.affiliates}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-cream-dim">{copy.affiliateBody}</p>
        <p className="max-w-2xl text-base leading-relaxed text-cream-dim">{copy.body}</p>
        <Link to="/app/advisor" className="focus-ring self-start rounded-full bg-accent px-5 py-3 font-semibold text-white">{copy.start}</Link>
      </main>
      <SiteFooter />
    </>
  );
}
