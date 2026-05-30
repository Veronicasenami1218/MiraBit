// src/hooks/useWallet.ts — Wallet state + mutations
//
// Two backends transparently behind the same public API:
//
//   1. SERVER-BACKED  (when VITE_API_BASE_URL is set AND user is logged in)
//      → uses /wallet, /payments/queue endpoints via apiFetch
//      → offline payments are enqueued server-side (POST /payments/queue)
//        and auto-flushed on reconnect (POST /payments/queue/flush)
//
//   2. LOCAL DEMO     (anything else)
//      → original localStorage behaviour, preserved verbatim so the
//        landing-page / pre-login experience still works
//
// The PUBLIC RETURN SHAPE is identical in both modes so no page component
// has to change:
//   { wallet, transactions, deposit, convertFunds, saveToBtc,
//     payBtc, settleQueued, reward }

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/hooks/useApi";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRates } from "@/hooks/useRates";
import {
  type Currency,
  type Transaction,
  type TxType,
  type Wallet,
  convert,
  newId,
  round,
} from "@/lib/mirabit";

const WALLET_KEY = "mirabit:wallet:v1";
const TX_KEY = "mirabit:transactions:v1";

// UPDATED: Starting balance is exactly 2,000 sats
const DEFAULT_WALLET: Wallet = { BTC: 0.00002, NGN: 0, USDT: 0 };

// UPDATED: Transaction history now reflects the 2,000 sats Welcome Bonus
const DEFAULT_TX: Transaction[] = [
  {
    id: "welcome-001",
    type: "receive",
    status: "completed",
    fromCurrency: null,
    fromAmount: 0,
    toCurrency: "BTC",
    toAmount: 0.00002,
    note: "Welcome Bonus 🎉",
    createdAt: Date.now(),
  },
];

interface RecordTxInput {
  type: TxType;
  fromCurrency: Currency | null;
  fromAmount: number;
  toCurrency: Currency;
  toAmount: number;
  note?: string;
  counterparty?: string;
  status?: "completed" | "queued" | "pending";
}

export interface UseWalletResult {
  wallet: Wallet;
  transactions: Transaction[];
  deposit: (
    currency: Currency,
    amount: number,
    note?: string,
  ) => Transaction | Promise<Transaction>;
  convertFunds: (
    from: Currency,
    to: Currency,
    amount: number,
    note?: string,
  ) => Transaction | Promise<Transaction>;
  saveToBtc: (
    from: Currency,
    amount: number,
    goalName?: string,
  ) => Transaction | Promise<Transaction>;
  payBtc: (
    amount: number,
    counterparty: string,
    online?: boolean,
    note?: string,
  ) => Transaction | Promise<Transaction>;
  settleQueued: () => number | Promise<number>;
  reward: (
    amountBtc: number,
    note: string,
  ) => Transaction | Promise<Transaction>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-BACKED implementation
// ─────────────────────────────────────────────────────────────────────────────

interface BackendBalance {
  pubkey: string;
  balances: Wallet;
  lightningBalanceSats: number;
  onchainBalanceSats: number;
  pendingSats: number;
}

interface BackendTxEnvelope {
  // The /transactions endpoint returns { data: Transaction[], meta }
  // and the wallet operations return { data: { wallet, transaction } }
  wallet?: BackendBalance;
  transaction?: Transaction;
}

function useServerWallet(pubkey: string): UseWalletResult {
  const api = useApi();
  const qc = useQueryClient();
  const enabled = api.isAuthenticated && pubkey.length === 64;

  const balanceKey = useMemo(
    () => ["wallet", "balance", pubkey] as const,
    [pubkey],
  );
  const txKey = useMemo(
    () => ["wallet", "transactions", pubkey] as const,
    [pubkey],
  );

  const balanceQuery = useQuery<BackendBalance>({
    queryKey: balanceKey,
    // Backend single-read endpoint returns the wallet envelope at /wallet/:pubkey
    queryFn: () => api.get<BackendBalance>(`/wallet/${pubkey}`),
    staleTime: 15_000,
    enabled,
  });

  const txQuery = useQuery<Transaction[]>({
    queryKey: txKey,
    queryFn: async () => {
      const list = await api.get<Transaction[]>(
        `/wallet/${pubkey}/transactions`,
        {
          query: { limit: 100 },
        },
      );
      return Array.isArray(list) ? list : [];
    },
    staleTime: 15_000,
    enabled,
  });

  const wallet: Wallet = balanceQuery.data?.balances ?? DEFAULT_WALLET;
  // If the server read fails, dispatch a global event so the UI can show
  // a small banner and fall back to the local demo data briefly.
  if (balanceQuery.isError) {
    try {
      window.dispatchEvent(
        new CustomEvent("mirabit_wallet_fallback", {
          detail: { message: "Backend wallet read failed" },
        }),
      );
    } catch {
      // ignore
    }
  }
  const transactions: Transaction[] = txQuery.data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────
  const onChange = () => {
    qc.invalidateQueries({ queryKey: balanceKey });
    qc.invalidateQueries({ queryKey: txKey });
  };

  const depositMut = useMutation({
    mutationFn: async (input: {
      currency: Currency;
      amount: number;
      note?: string;
    }) => {
      const res = await api.post<BackendTxEnvelope>(
        `/wallet/${pubkey}/deposit`,
        input,
      );
      return res.transaction!;
    },
    onSuccess: onChange,
  });

  const convertMut = useMutation({
    mutationFn: async (input: {
      fromCurrency: Currency;
      toCurrency: Currency;
      amount: number;
    }) => {
      const res = await api.post<BackendTxEnvelope>(
        `/wallet/${pubkey}/convert`,
        input,
      );
      return res.transaction!;
    },
    onSuccess: onChange,
  });

  const saveMut = useMutation({
    mutationFn: async (input: {
      sourceCurrency: Currency;
      amount: number;
      goalId?: string;
    }) => {
      const res = await api.post<BackendTxEnvelope>(
        `/wallet/${pubkey}/save-to-btc`,
        input,
      );
      return res.transaction!;
    },
    onSuccess: onChange,
  });

  const rewardMut = useMutation({
    mutationFn: async (input: { amountBtc: number; note?: string }) => {
      const res = await api.post<BackendTxEnvelope>(
        `/wallet/${pubkey}/reward`,
        input,
      );
      return res.transaction!;
    },
    onSuccess: onChange,
  });

  // Offline pay = enqueue on the server
  const enqueueMut = useMutation({
    mutationFn: async (input: {
      recipient: string;
      amount: number;
      sourceCurrency: Currency;
      note?: string;
    }) => {
      return api.post<{ id: string; status: string }>(`/payments/queue`, input);
    },
    onSuccess: onChange,
  });

  // Online pay = ask the LN service to settle now
  const payNowMut = useMutation({
    mutationFn: async (input: { invoice: string; amountSats: number }) => {
      return api.post<{ paymentHash: string; status: string }>(
        `/lightning/pay`,
        input,
      );
    },
    onSuccess: onChange,
  });

  // Flush server-side offline queue
  const flushMut = useMutation({
    mutationFn: async () =>
      api.post<{
        processed: number;
        completed: number;
        failed: number;
        retried: number;
      }>(`/payments/queue/flush`, {}),
    onSuccess: onChange,
  });

  // ── Public API ──────────────────────────────────────────────────────────

  const deposit = useCallback(
    async (
      currency: Currency,
      amount: number,
      note = "Top-up",
    ): Promise<Transaction> => {
      if (amount <= 0) throw new Error("Amount must be positive");
      return depositMut.mutateAsync({ currency, amount, note });
    },
    [depositMut],
  );

  const convertFunds = useCallback(
    async (
      from: Currency,
      to: Currency,
      amount: number,
    ): Promise<Transaction> => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if (from === to) throw new Error("Pick two different currencies");
      return convertMut.mutateAsync({
        fromCurrency: from,
        toCurrency: to,
        amount,
      });
    },
    [convertMut],
  );

  const saveToBtc = useCallback(
    async (
      from: Currency,
      amount: number,
      goalName?: string,
    ): Promise<Transaction> => {
      if (amount <= 0) throw new Error("Amount must be positive");
      // We don't currently have a goalName→goalId map here; the page that
      // knows the goal id can call /save-to-btc directly with goalId.
      // goalName is preserved purely for the transaction note.
      const tx = await saveMut.mutateAsync({ sourceCurrency: from, amount });
      if (goalName && tx) tx.note = `Saved to ${goalName}`;
      return tx;
    },
    [saveMut],
  );

  /**
   * payBtc:
   * - online === true  → tries to settle now via /lightning/pay if a valid
   * BOLT-11 invoice is detected; otherwise records a local pending tx
   * placeholder. (Recipient resolution by handle/address is server-side
   * future work.)
   * - online === false → server-side enqueue via /payments/queue.
   */
  const payBtc = useCallback(
    async (
      amount: number,
      counterparty: string,
      online = true,
      note?: string,
    ): Promise<Transaction> => {
      if (amount <= 0) throw new Error("Amount must be positive");

      if (!online) {
        const queued = await enqueueMut.mutateAsync({
          recipient: counterparty,
          amount,
          sourceCurrency: "BTC",
          note: note ?? "Queued while offline",
        });
        // Synthetic Transaction shape so the UI list stays consistent
        return {
          id: queued.id,
          type: "pay",
          status: "queued",
          fromCurrency: "BTC",
          fromAmount: amount,
          toCurrency: "BTC",
          toAmount: amount,
          counterparty,
          note: note ?? "Queued while offline",
          createdAt: Date.now(),
        };
      }

      // Online path: if recipient is a BOLT-11 invoice, settle now.
      const isInvoice = /^(lnbc|lntb|lnbcrt)\d/i.test(counterparty.trim());
      if (isInvoice) {
        const amountSats = Math.round(amount * 1e8);
        await payNowMut.mutateAsync({
          invoice: counterparty.trim(),
          amountSats,
        });
        // Backend logs the Transaction itself; we return a synthetic optimistic record
        return {
          id: newId(),
          type: "pay",
          status: "completed",
          fromCurrency: "BTC",
          fromAmount: amount,
          toCurrency: "BTC",
          toAmount: amount,
          counterparty,
          note,
          createdAt: Date.now(),
        };
      }

      // Non-invoice (address / @handle) online send: server-side resolver
      // is not yet implemented. Enqueue anyway so it can be settled when
      // resolution is available.
      const queued = await enqueueMut.mutateAsync({
        recipient: counterparty,
        amount,
        sourceCurrency: "BTC",
        note: note ?? "Send (pending resolution)",
      });
      return {
        id: queued.id,
        type: "pay",
        status: "pending",
        fromCurrency: "BTC",
        fromAmount: amount,
        toCurrency: "BTC",
        toAmount: amount,
        counterparty,
        note: note ?? "Send (pending resolution)",
        createdAt: Date.now(),
      };
    },
    [enqueueMut, payNowMut],
  );

  const settleQueued = useCallback(async (): Promise<number> => {
    const result = await flushMut.mutateAsync();
    return result?.completed ?? 0;
  }, [flushMut]);

  const reward = useCallback(
    async (amountBtc: number, note: string): Promise<Transaction> => {
      if (amountBtc <= 0) throw new Error("Reward must be positive");
      return rewardMut.mutateAsync({ amountBtc, note });
    },
    [rewardMut],
  );

  return {
    wallet,
    transactions,
    deposit,
    convertFunds,
    saveToBtc,
    payBtc,
    settleQueued,
    reward,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL DEMO implementation (preserved from the pre-backend MVP)
// ─────────────────────────────────────────────────────────────────────────────

function useLocalWallet(): UseWalletResult {
  const [wallet, setWallet] = useLocalStorage<Wallet>(
    WALLET_KEY,
    DEFAULT_WALLET,
  );
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    TX_KEY,
    DEFAULT_TX,
  );
  const { rates } = useRates();

  const recordTransaction = useCallback(
    (input: RecordTxInput): Transaction => {
      const tx: Transaction = {
        id: newId(),
        status: input.status ?? "completed",
        type: input.type,
        fromCurrency: input.fromCurrency,
        fromAmount: input.fromAmount,
        toCurrency: input.toCurrency,
        toAmount: input.toAmount,
        note: input.note,
        counterparty: input.counterparty,
        createdAt: Date.now(),
      };
      setTransactions((prev) => [tx, ...prev].slice(0, 200));
      return tx;
    },
    [setTransactions],
  );

  const applyToWallet = useCallback(
    (delta: Partial<Wallet>) => {
      setWallet((prev) => ({
        BTC: round((prev.BTC ?? 0) + (delta.BTC ?? 0), "BTC"),
        NGN: round((prev.NGN ?? 0) + (delta.NGN ?? 0), "NGN"),
        USDT: round((prev.USDT ?? 0) + (delta.USDT ?? 0), "USDT"),
      }));
    },
    [setWallet],
  );

  const deposit = useCallback(
    (currency: Currency, amount: number, note = "Top-up") => {
      if (amount <= 0) throw new Error("Amount must be positive");
      applyToWallet({ [currency]: amount } as Partial<Wallet>);
      return recordTransaction({
        type: "receive",
        fromCurrency: null,
        fromAmount: 0,
        toCurrency: currency,
        toAmount: amount,
        note,
      });
    },
    [applyToWallet, recordTransaction],
  );

  const convertFunds = useCallback(
    (
      from: Currency,
      to: Currency,
      amount: number,
      note?: string,
    ): Transaction => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if (from === to) throw new Error("Pick two different currencies");
      if ((wallet[from] ?? 0) < amount)
        throw new Error(`Insufficient ${from} balance`);
      const received = convert(amount, from, to, rates);
      applyToWallet({ [from]: -amount, [to]: received } as Partial<Wallet>);
      return recordTransaction({
        type: "convert",
        fromCurrency: from,
        fromAmount: amount,
        toCurrency: to,
        toAmount: received,
        note: note ?? `Converted ${from} → ${to}`,
      });
    },
    [wallet, rates, applyToWallet, recordTransaction],
  );

  const saveToBtc = useCallback(
    (from: Currency, amount: number, goalName?: string): Transaction => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if ((wallet[from] ?? 0) < amount - 1e-10)
        throw new Error(`Insufficient ${from} balance`);

      // If saving from BTC directly, no conversion needed — just record the tx
      const btc = from === "BTC" ? amount : convert(amount, from, "BTC", rates);
      const walletDelta: Partial<Wallet> =
        from === "BTC"
          ? {} // BTC is already in the wallet; recording the intent is enough
          : ({ [from]: -amount, BTC: btc } as Partial<Wallet>);

      applyToWallet(walletDelta);
      return recordTransaction({
        type: "save",
        fromCurrency: from,
        fromAmount: amount,
        toCurrency: "BTC",
        toAmount: btc,
        note: goalName ? `Saved to ${goalName}` : "Saved to BTC",
      });
    },
    [wallet, rates, applyToWallet, recordTransaction],
  );

  const payBtc = useCallback(
    (
      amount: number,
      counterparty: string,
      online = true,
      note?: string,
    ): Transaction => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if (online) {
        if ((wallet.BTC ?? 0) < amount)
          throw new Error("Insufficient BTC balance");
        applyToWallet({ BTC: -amount });
        return recordTransaction({
          type: "pay",
          fromCurrency: "BTC",
          fromAmount: amount,
          toCurrency: "BTC",
          toAmount: amount,
          counterparty,
          note,
          status: "completed",
        });
      }
      return recordTransaction({
        type: "pay",
        fromCurrency: "BTC",
        fromAmount: amount,
        toCurrency: "BTC",
        toAmount: amount,
        counterparty,
        note: note ?? "Queued while offline",
        status: "queued",
      });
    },
    [wallet, applyToWallet, recordTransaction],
  );

  const settleQueued = useCallback(() => {
    let updated = false;
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.status !== "queued") return tx;
        updated = true;
        return {
          ...tx,
          status: "completed" as const,
          note: (tx.note ?? "") + " (synced)",
        };
      }),
    );
    if (!updated) return 0;

    let count = 0;
    setWallet((prev) => {
      let btc = prev.BTC;
      for (const tx of transactions) {
        if (
          tx.status === "queued" &&
          tx.type === "pay" &&
          tx.fromCurrency === "BTC"
        ) {
          if (btc >= tx.fromAmount) {
            btc = round(btc - tx.fromAmount, "BTC");
            count += 1;
          }
        }
      }
      return { ...prev, BTC: btc };
    });
    return count;
  }, [transactions, setTransactions, setWallet]);

  const reward = useCallback(
    (amountBtc: number, note: string): Transaction => {
      applyToWallet({ BTC: amountBtc });
      return recordTransaction({
        type: "learn-reward",
        fromCurrency: null,
        fromAmount: 0,
        toCurrency: "BTC",
        toAmount: amountBtc,
        note,
      });
    },
    [applyToWallet, recordTransaction],
  );

  return {
    wallet,
    transactions,
    deposit,
    convertFunds,
    saveToBtc,
    payBtc,
    settleQueued,
    reward,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wallet hook with two transparent backends:
 *
 * - SERVER  when both VITE_API_BASE_URL is set AND the user is logged in
 * - LOCAL   otherwise (localStorage-only demo mode, preserved verbatim)
 *
 * Public return shape never changes, so page components don't care which
 * mode they are running under.
 *
 * Implementation note: we ALWAYS call both hooks so React's hook order is
 * stable across renders (the user can log in/out at runtime). The unused
 * one is harmless – useServerWallet is disabled via `enabled: pubkey != null`
 * inside its react-query calls.
 */
export function useWallet(): UseWalletResult {
  const api = useApi();
  const server = useServerWallet(api.pubkey ?? "");
  const local = useLocalWallet();

  return api.isAuthenticated && api.pubkey ? server : local;
}
