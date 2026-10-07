/**
 * Paddle's checkout, for readers outside Peru.
 *
 * Paddle.js is loaded only when somebody presses the button — the landing
 * page and every reader in Peru never download it. The checkout is Paddle's
 * own overlay: it asks for the billing address, charges in the reader's
 * currency at the price set for their country, and adds the tax that country
 * requires. Nothing about the card passes through this app.
 */

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox") => void };
      Initialize: (options: {
        token: string;
        eventCallback?: (event: { name?: string; data?: { transaction_id?: string } }) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: { displayMode?: "overlay"; locale?: string; theme?: "light" | "dark" };
        }) => void;
      };
    };
  }
}

export interface PaddleClient {
  env: "sandbox" | "production";
  clientToken: string;
  priceMonthly: string;
  priceYearly: string;
  ownerId: string;
}

const SCRIPT = "https://cdn.paddle.com/paddle/v2/paddle.js";
let loading: Promise<void> | null = null;
let initialised = false;
let onCompleted: ((transactionId: string | null) => void) | null = null;

function load(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      loading = null;
      reject(new Error("Paddle.js did not load"));
    };
    document.head.appendChild(tag);
  });
  return loading;
}

/** Paddle's checkout languages; anything else opens in English. */
const PADDLE_LOCALES = new Set(["en", "es", "pt", "fr", "de", "it", "ja", "ko", "zh-Hans", "ru", "nl", "pl", "sv", "da", "no", "tr", "uk", "cs", "hu"]);

export async function openPaddleCheckout(input: {
  paddle: PaddleClient;
  cycle: "monthly" | "yearly";
  email: string | null;
  locale: string;
  theme: "light" | "dark";
  /** Called once the payment goes through, before the webhook has landed. */
  completed: (transactionId: string | null) => void;
}): Promise<void> {
  await load();
  const paddle = window.Paddle!;
  onCompleted = input.completed;
  if (!initialised) {
    if (input.paddle.env === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({
      token: input.paddle.clientToken,
      eventCallback: (event) => {
        if (event.name === "checkout.completed") onCompleted?.(event.data?.transaction_id ?? null);
      },
    });
    initialised = true;
  }
  const locale = input.locale === "zh" ? "zh-Hans" : input.locale;
  paddle.Checkout.open({
    items: [
      {
        priceId: input.cycle === "yearly" ? input.paddle.priceYearly : input.paddle.priceMonthly,
        quantity: 1,
      },
    ],
    ...(input.email ? { customer: { email: input.email } } : {}),
    customData: { ownerId: input.paddle.ownerId },
    settings: {
      displayMode: "overlay",
      theme: input.theme,
      ...(PADDLE_LOCALES.has(locale) ? { locale } : {}),
    },
  });
}
