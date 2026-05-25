// MiraBit — core types, constants, and helpers.
//
// The MVP is fully client-side: balances, transactions and exchange rates live
// in localStorage. This lets students explore the full UX (savings, payments,
// conversions, learning) without a backend, while keeping the code structured
// so a real backend / wallet provider can be wired in later.

export type Currency = "BTC" | "NGN" | "USDT";

export const CURRENCY_META: Record<
  Currency,
  { label: string; symbol: string; decimals: number; color: string; tint: string }
> = {
  BTC: {
    label: "Bitcoin",
    symbol: "₿",
    decimals: 8,
    color: "text-[hsl(28_96%_54%)]",
    tint: "bg-[hsl(28_96%_54%)]/10",
  },
  NGN: {
    label: "Naira",
    symbol: "₦",
    decimals: 2,
    color: "text-[hsl(212_90%_50%)]",
    tint: "bg-[hsl(212_90%_50%)]/10",
  },
  USDT: {
    label: "Tether USD",
    symbol: "$",
    decimals: 2,
    color: "text-[hsl(160_84%_39%)]",
    tint: "bg-[hsl(160_84%_39%)]/10",
  },
};

/** Static reference rates used when no live rate is cached. */
export const FALLBACK_RATES = {
  /** 1 BTC in USD (≈ USDT). */
  BTC_USD: 67500,
  /** 1 USD in NGN. */
  USD_NGN: 1580,
} as const;

export type TxType = "save" | "convert" | "pay" | "receive" | "learn-reward";
export type TxStatus = "completed" | "pending" | "queued";

export interface Transaction {
  id: string;
  type: TxType;
  status: TxStatus;
  /** Currency leaving the wallet (null for receive / learn-reward). */
  fromCurrency: Currency | null;
  fromAmount: number;
  /** Currency entering the wallet. */
  toCurrency: Currency;
  toAmount: number;
  /** Free-form note shown in the history. */
  note?: string;
  /** Optional counterparty (handle, address, etc). */
  counterparty?: string;
  /** Unix ms. */
  createdAt: number;
}

export interface Wallet {
  BTC: number;
  NGN: number;
  USDT: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetCurrency: Currency;
  targetAmount: number;
  /** Stored amount in BTC (savings always convert into BTC). */
  btcSaved: number;
  createdAt: number;
}

/** Round to currency-appropriate precision. */
export function round(amount: number, currency: Currency): number {
  const d = CURRENCY_META[currency].decimals;
  const m = 10 ** d;
  return Math.round(amount * m) / m;
}

/** Human-readable amount with thousands separators. */
export function formatAmount(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) return "0";
  const decimals = CURRENCY_META[currency].decimals;
  if (currency === "BTC") {
    // Trim trailing zeros for BTC but keep at least 2 decimals when non-zero.
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: amount === 0 ? 2 : 2,
      maximumFractionDigits: decimals,
    });
  }
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(amount: number, currency: Currency): string {
  return `${CURRENCY_META[currency].symbol}${formatAmount(amount, currency)}`;
}

/** Convert `amount` of `from` into `to` using BTC/USD and USD/NGN. */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: { BTC_USD: number; USD_NGN: number }
): number {
  if (from === to) return amount;
  // Normalize everything to USD first.
  let usd: number;
  switch (from) {
    case "BTC":
      usd = amount * rates.BTC_USD;
      break;
    case "USDT":
      usd = amount;
      break;
    case "NGN":
      usd = amount / rates.USD_NGN;
      break;
  }
  let result: number;
  switch (to) {
    case "BTC":
      result = usd / rates.BTC_USD;
      break;
    case "USDT":
      result = usd;
      break;
    case "NGN":
      result = usd * rates.USD_NGN;
      break;
  }
  return round(result, to);
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(ts).toLocaleDateString();
}

export function newId(): string {
  // 8-char base36 id, sufficient for client-side records.
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
