import { useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FALLBACK_RATES } from "@/lib/mirabit";

const RATES_KEY = "mirabit:rates:v1";
const ONE_HOUR = 1000 * 60 * 60;

interface RatesState {
  BTC_USD: number;
  USD_NGN: number;
  /** Unix ms when these were last refreshed. */
  updatedAt: number;
  /** True if cached fallback (not a live fetch). */
  isStale: boolean;
}

const DEFAULT_RATES: RatesState = {
  BTC_USD: FALLBACK_RATES.BTC_USD,
  USD_NGN: FALLBACK_RATES.USD_NGN,
  updatedAt: 0,
  isStale: true,
};

/**
 * Provides exchange rates for BTC/USD and USD/NGN.
 *
 * The MVP gracefully falls back to bundled reference rates if no network is
 * available — this is intentional, since "offline mode" is a core feature.
 * When a live fetch succeeds, the rates are cached in localStorage.
 */
export function useRates() {
  const [rates, setRates] = useLocalStorage<RatesState>(RATES_KEY, DEFAULT_RATES);

  useEffect(() => {
    // Throttle: don't refetch more than once per hour.
    if (Date.now() - rates.updatedAt < ONE_HOUR) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const controller = new AbortController();

    (async () => {
      try {
        const proxied = (u: string) =>
          `https://proxy.shakespeare.diy/?url=${encodeURIComponent(u)}`;

        // BTC/USD from CoinGecko (free, no key).
        const btcRes = await fetch(
          proxied("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"),
          { signal: controller.signal },
        );
        const btcJson = (await btcRes.json()) as { bitcoin?: { usd?: number } };
        const btcUsd = btcJson?.bitcoin?.usd;

        // USD/NGN from a free FX endpoint with a couple of fallbacks.
        let usdNgn: number | undefined;
        try {
          const fxRes = await fetch(
            proxied("https://open.er-api.com/v6/latest/USD"),
            { signal: controller.signal },
          );
          const fxJson = (await fxRes.json()) as { rates?: { NGN?: number } };
          usdNgn = fxJson?.rates?.NGN;
        } catch {
          // ignore — keep cached value
        }

        if (typeof btcUsd === "number" || typeof usdNgn === "number") {
          setRates((prev) => ({
            BTC_USD: typeof btcUsd === "number" && btcUsd > 0 ? btcUsd : prev.BTC_USD,
            USD_NGN: typeof usdNgn === "number" && usdNgn > 0 ? usdNgn : prev.USD_NGN,
            updatedAt: Date.now(),
            isStale: false,
          }));
        }
      } catch {
        // Offline or network error — silently keep cached / fallback rates.
      }
    })();

    return () => controller.abort();
    // We deliberately only run once at mount; rates have their own TTL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates };
}
