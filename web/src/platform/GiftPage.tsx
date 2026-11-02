import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { useLocale } from "@/hooks/useLocale";
import { freeAccessCopy } from "@/lib/free-access-copy";

/** Existing gift URLs remain useful without starting another purchase. */
export function GiftPage() {
  const { locale } = useLocale();
  const copy = freeAccessCopy(locale);
  return (
    <AuthLayout>
      <div className="flex flex-col gap-5">
        <h1 className="text-balance text-xl text-cream-bright">{copy.title}</h1>
        <p className="text-sm leading-relaxed text-cream-dim">{copy.gift}</p>
        <p className="text-sm leading-relaxed text-cream-dim">{copy.body}</p>
        <Link to="/app" className="focus-ring self-start rounded-full bg-accent px-5 py-3 font-semibold text-white">{copy.start}</Link>
      </div>
    </AuthLayout>
  );
}
