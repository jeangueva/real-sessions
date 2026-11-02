import { useEffect, useState } from "react";
import { Eyebrow, Panel } from "@/design-system";

/** A preference reminder, not a checkout: the provider confirms the payment. */
export function Support() {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("5");
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState("one-time");
  useEffect(() => {
    let mounted = true;
    fetch("/api/support").then(async (response) => {
      if (!response.ok) throw new Error("Support unavailable");
      const config = await response.json() as { url?: string | null };
      if (config.url) {
        const target = new URL(config.url);
        if (mounted && target.protocol === "https:" && !target.username && !target.password) setUrl(target.href);
      }
    }).catch(() => undefined).finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);
  const selected = amount === "custom" ? custom : amount;
  const valid = /^\d+(\.\d{1,2})?$/.test(selected) && Number(selected) > 0 && Number.isFinite(Number(selected));
  return <Panel className="mt-4 max-w-2xl p-6 sm:p-8">
    <Eyebrow>Optional support</Eyebrow>
    <h3 className="mt-3 text-xl text-cream-bright">Free for everyone. Supported by choice.</h3>
    <p className="mt-3 text-sm text-cream-dim">All features are 100% free. Donations never unlock features, extra access, or priority.</p>
    <fieldset className="mt-5 flex flex-wrap gap-2">
      <legend className="mb-2 text-sm">Suggested amount (USD)</legend>
      {["1", "2", "5", "8", "10", "custom"].map((value) => <button type="button" key={value} aria-pressed={amount === value} onClick={() => setAmount(value)} className="focus-ring rounded-full border border-line px-4 py-2 aria-pressed:bg-surface-lift">
        {value === "custom" ? "Custom" : `$${value}`}
      </button>)}
    </fieldset>
    {amount === "custom" && <label className="mt-3 block text-sm">Custom amount (USD)
      <input className="focus-ring ml-3 rounded border border-line bg-surface-lift p-2" type="number" min="0.01" step="0.01" inputMode="decimal" value={custom} onChange={(event) => setCustom(event.target.value)} />
    </label>}
    <fieldset className="mt-4 flex gap-4">
      <legend className="mb-2 text-sm">Frequency</legend>
      {["one-time", "monthly"].map((value) => <label key={value} className="text-sm"><input type="radio" name="support-frequency" value={value} checked={frequency === value} onChange={() => setFrequency(value)} /> {value === "monthly" ? "Monthly" : "One-time"}</label>)}
    </fieldset>
    <p className="mt-4 text-sm text-cream-dim">{valid ? `Your preference: USD ${Number(selected).toFixed(2)}, ${frequency}. ` : "Enter a positive amount with up to two decimal places. "}Choose this amount and frequency again on the support page. These selections are not sent to the provider. Confirm the currency and recurring payment terms there before paying.</p>
    {url && valid ? <a className="focus-ring mt-5 inline-block rounded-full bg-surface-lift px-5 py-3 text-sm" href={url} target="_blank" rel="noopener noreferrer">Open support page ↗</a> : !url && <p role="status" className="mt-4 text-sm text-cream-faint">{loaded ? "Support is not set up yet. Everything remains free." : "Checking support availability…"}</p>}
  </Panel>;
}
