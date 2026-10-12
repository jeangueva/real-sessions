import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { Panel } from "@/design-system";
import { ApiError, fetchAdvisorLink, linkAdvisor, shareWithAdvisor, unlinkAdvisor } from "@/lib/api";
import type { AdvisorLinkInfo } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * The student's side of the advisor link. Linking and sharing are two
 * separate choices, and the share box starts unticked.
 */
export function AdvisorCard() {
  const t = useThesisT();
  const [link, setLink] = useState<AdvisorLinkInfo | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [share, setShare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdvisorLink()
      .then((result) => setLink(result.link))
      .catch(() => setLink(null));
  }, []);

  const run = async (action: () => Promise<{ link: AdvisorLinkInfo | null }>) => {
    setError(null);
    try {
      setLink((await action()).link);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    }
  };

  if (link === undefined) return null;
  return (
    <Panel className="flex flex-col gap-3 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
        <GraduationCap aria-hidden className="h-5 w-5 text-accent-text" />
        {t("advisorCardTitle")}
      </h2>
      {link ? (
        <>
          <p className="text-sm text-cream">{t("advisorLinked", { name: link.advisorName })}</p>
          <label className="flex items-start gap-2 text-sm text-cream">
            <input
              type="checkbox"
              className="mt-1"
              checked={link.share}
              onChange={(event) => void run(() => shareWithAdvisor(event.target.checked))}
            />
            {t("advisorShare")}
          </label>
          <p className="text-xs text-cream-dim">{link.share ? t("advisorSharing") : t("advisorNotSharing")}</p>
          <button
            type="button"
            onClick={() => void run(() => unlinkAdvisor())}
            className="focus-ring self-start rounded-full text-xs font-semibold text-cream-dim underline underline-offset-4"
          >
            {t("advisorUnlink")}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-cream-dim">{t("advisorCardBody")}</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder={t("advisorCode")}
              maxLength={6}
              className="focus-ring w-40 rounded-2xl bg-surface-lift px-4 py-2.5 font-mono text-sm tracking-widest text-cream-bright placeholder:font-sans placeholder:tracking-normal placeholder:text-cream-faint"
            />
            <button
              type="button"
              disabled={code.trim().length !== 6}
              onClick={() => void run(() => linkAdvisor(code, share))}
              className="focus-ring rounded-full bg-surface-lift px-4 py-2 text-sm font-semibold text-cream-bright active:scale-[0.97] disabled:opacity-50"
            >
              {t("advisorLink")}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-cream">
            <input type="checkbox" className="mt-1" checked={share} onChange={(event) => setShare(event.target.checked)} />
            {t("advisorShare")}
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-step-text">
          {error}
        </p>
      )}
    </Panel>
  );
}
