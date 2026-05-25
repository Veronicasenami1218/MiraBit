import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  type Currency,
  type Transaction,
  type TxType,
  type Wallet,
  convert,
  newId,
  round,
} from "@/lib/mirabit";
import { useRates } from "@/hooks/useRates";

const WALLET_KEY = "mirabit:wallet:v1";
const TX_KEY = "mirabit:transactions:v1";

const DEFAULT_WALLET: Wallet = {
  // Seed with a small starter balance so new users see live numbers.
  BTC: 0.0008,
  NGN: 25000,
  USDT: 15,
};

const DEFAULT_TX: Transaction[] = [
  {
    id: "welcome-001",
    type: "learn-reward",
    status: "completed",
    fromCurrency: null,
    fromAmount: 0,
    toCurrency: "BTC",
    toAmount: 0.00005,
    note: "Welcome to MiraBit! 🎉",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
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

export function useWallet() {
  const [wallet, setWallet] = useLocalStorage<Wallet>(WALLET_KEY, DEFAULT_WALLET);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(TX_KEY, DEFAULT_TX);
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

  /** Add funds (top up). Purely simulated in the MVP. */
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

  /** Convert between currencies. */
  const convertFunds = useCallback(
    (from: Currency, to: Currency, amount: number, note?: string): Transaction => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if (from === to) throw new Error("Pick two different currencies");
      if ((wallet[from] ?? 0) < amount) throw new Error(`Insufficient ${from} balance`);
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

  /** Move funds into BTC savings (any source currency → BTC). */
  const saveToBtc = useCallback(
    (from: Currency, amount: number, goalName?: string): Transaction => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if ((wallet[from] ?? 0) < amount) throw new Error(`Insufficient ${from} balance`);
      const btc = convert(amount, from, "BTC", rates);
      applyToWallet({ [from]: -amount, BTC: btc } as Partial<Wallet>);
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

  /** Pay with BTC. If `online` is false, queue instead of completing. */
  const payBtc = useCallback(
    (amount: number, counterparty: string, online = true, note?: string): Transaction => {
      if (amount <= 0) throw new Error("Amount must be positive");
      if (online) {
        if ((wallet.BTC ?? 0) < amount) throw new Error("Insufficient BTC balance");
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
      // Offline: just queue it. Funds stay until we come back online.
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

  /** Settle all queued transactions (e.g. when connection returns). */
  const settleQueued = useCallback(() => {
    let updated = false;
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.status !== "queued") return tx;
        // Try to debit. If balance is insufficient, mark pending instead.
        // We must read the latest wallet value via the functional setter below.
        updated = true;
        return { ...tx, status: "completed" as const, note: (tx.note ?? "") + " (synced)" };
      }),
    );
    if (!updated) return 0;

    // Apply debits in one pass.
    let count = 0;
    setWallet((prev) => {
      let btc = prev.BTC;
      for (const tx of transactions) {
        if (tx.status === "queued" && tx.type === "pay" && tx.fromCurrency === "BTC") {
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
