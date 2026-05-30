// src/hooks/useRates.ts — Exchange rates with three-tier fallback
//
//   1. Backend  /conversion/rates/fe   (when VITE_API_BASE_URL is set)
//   2. Direct public APIs via proxy    (when backend is unreachable)
//   3. LocalStorage cached snapshot    (kept fresh by any of the above)
//   4. FALLBACK_RATES from mirabit.ts  (true offline, first visit)
//
// The public return shape `{ rates }` is preserved so existing components
// (BalanceCard, ConvertPage, PayPage, SavingsPage) don't have to change.

import { useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FALLBACK_RATES } from "@/lib/mirabit";
import { apiFetch, isApiConfigured } from "@/lib/api";

const RATES_KEY = "mirabit:rates:v1";
const ONE_HOUR  = 1000 * 60 * 60;

interface RatesState {
  BTC_USD: number;
  USD_NGN: number;
  /** Unix ms when these were last refreshed. */
  updatedAt: number;
  /** True if cached fallback (not a live fetch). */
  isStale: boolean;
}

const DEFAULT_RATES: RatesState = {
  BTC_USD:   FALLBACK_RATES.BTC_USD,
  USD_NGN:   FALLBACK_RATES.USD_NGN,
  updatedAt: 0,
  isStale:   true,
};

async function fetchFromBackend(signal: AbortSignal): Promise<Partial<RatesState> | null> {
  if (!isApiConfigured()) return null;
  try {
    const data = await apiFetch<RatesState>("/conversion/rates/fe", { signal });
    if (
      typeof data?.BTC_USD === "number" && data.BTC_USD > 0 &&
      typeof data?.USD_NGN === "number" && data.USD_NGN > 0
    ) {
      return data;
    }
  } catch {
    // backend offline / not deployed yet → try direct fetch next
  }
  return null;
}

async function fetchFromProxy(signal: AbortSignal): Promise<Partial<RatesState> | null> {
  const proxied = (u: string) =>
    `https://proxy.shakespeare.diy/?url=${encodeURIComponent(u)}`;

  let btcUsd: number | undefined;
  let usdNgn: number | undefined;

  try {
    const btcRes = await fetch(
      proxied("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"),
      { signal },
    );
    const btcJson = (await btcRes.json()) as { bitcoin?: { usd?: number } };
    btcUsd = btcJson?.bitcoin?.usd;
  } catch { /* ignore */ }

  try {
    const fxRes = await fetch(proxied("https://open.er-api.com/v6/latest/USD"), { signal });
    const fxJson = (await fxRes.json()) as { rates?: { NGN?: number } };
    usdNgn = fxJson?.rates?.NGN;
  } catch { /* ignore */ }

  if (typeof btcUsd === "number" || typeof usdNgn === "number") {
    return {
      BTC_USD: typeof btcUsd === "number" && btcUsd > 0 ? btcUsd : undefined,
      USD_NGN: typeof usdNgn === "number" && usdNgn > 0 ? usdNgn : undefined,
    };
  }
  return null;
}

/**
 * Provides exchange rates for BTC/USD and USD/NGN with smart fallback.
 *
 * Network strategy:
 *   1. Hit backend if configured (also caches server-side).
 *   2. Otherwise try direct public APIs through the proxy.
 *   3. Fall back to whatever is in localStorage.
 *   4. If that's empty too, use the bundled FALLBACK_RATES.
 *
 * Either way, the rates are persisted to localStorage so true-offline
 * sessions still get reasonable numbers.
 */
export function useRates() {
  const [rates, setRates] = useLocalStorage<RatesState>(RATES_KEY, DEFAULT_RATES);

  useEffect(() => {
    // Throttle: don't refetch more than once per hour
    if (Date.now() - rates.updatedAt < ONE_HOUR) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const controller = new AbortController();

    (async () => {
      const fresh =
        (await fetchFromBackend(controller.signal)) ??
        (await fetchFromProxy(controller.signal));

      if (!fresh) return; // keep cached / fallback

      setRates((prev) => ({
        BTC_USD:   fresh.BTC_USD   ?? prev.BTC_USD,
        USD_NGN:   fresh.USD_NGN   ?? prev.USD_NGN,
        updatedAt: fresh.updatedAt ?? Date.now(),
        isStale:   false,
      }));
    })();

    return () => controller.abort();
    // Run once at mount; rates have their own TTL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates };
}
