import { useState } from "react";
import { Bitcoin, Eye, EyeOff, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { useRates } from "@/hooks/useRates";
import { convert, formatCurrency, type Currency } from "@/lib/mirabit";

interface BalanceCardProps {
  displayCurrency?: Currency;
  onChangeDisplayCurrency?: (c: Currency) => void;
}

export function BalanceCard({
  displayCurrency = "NGN",
  onChangeDisplayCurrency,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);
  const { wallet } = useWallet();
  const { rates } = useRates();

  // NEW: Helper function to calculate the total wallet value in any given currency
  const getTotalIn = (targetCurrency: Currency) => {
    return (
      convert(wallet.BTC, "BTC", targetCurrency, rates) +
      convert(wallet.NGN, "NGN", targetCurrency, rates) +
      convert(wallet.USDT, "USDT", targetCurrency, rates)
    );
  };

  const totalInDisplay = getTotalIn(displayCurrency);

  // Big Display Format: If BTC is selected, show it as Sats here
  const displayString =
    displayCurrency === "BTC"
      ? `${Math.round(totalInDisplay * 100_000_000).toLocaleString()} sats`
      : formatCurrency(totalInDisplay, displayCurrency);

  const currencyLabel = displayCurrency === "BTC" ? "sats" : displayCurrency;

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-slate-900 dark:text-white bg-slate-50 dark:bg-transparent border border-slate-200/80 dark:border-none shadow-md dark:shadow-xl transition-all duration-300">
      {/* Layered gradient background - ONLY visible in dark mode */}
      <div
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "linear-gradient(135deg, hsl(28 96% 54%) 0%, hsl(18 92% 48%) 55%, hsl(340 80% 50%) 100%)",
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay hidden dark:block"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 0%, white 0px, transparent 40%), radial-gradient(circle at 0% 100%, white 0px, transparent 35%)",
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-white/80 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-amber-500 dark:text-white/80" />
            Total balance
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl md:text-5xl font-extrabold tracking-tight tabular-nums">
              {hidden ? "••••••" : displayString}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-white/70">
            in {currencyLabel} · live rate updated periodically
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 dark:text-white dark:hover:bg-white/15 dark:hover:text-white shrink-0"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
        >
          {hidden ? (
            <Eye className="h-5 w-5" />
          ) : (
            <EyeOff className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {/* CHANGED: Passing getTotalIn() so the chips reflect the total portfolio value */}
        <BalanceChip
          label="Bitcoin"
          amount={getTotalIn("BTC")}
          currency="BTC"
          hidden={hidden}
          accent
          onSelect={
            onChangeDisplayCurrency
              ? () => onChangeDisplayCurrency("BTC")
              : undefined
          }
          active={displayCurrency === "BTC"}
        />
        <BalanceChip
          label="Naira"
          amount={getTotalIn("NGN")}
          currency="NGN"
          hidden={hidden}
          onSelect={
            onChangeDisplayCurrency
              ? () => onChangeDisplayCurrency("NGN")
              : undefined
          }
          active={displayCurrency === "NGN"}
        />
        <BalanceChip
          label="USDT"
          amount={getTotalIn("USDT")}
          currency="USDT"
          hidden={hidden}
          onSelect={
            onChangeDisplayCurrency
              ? () => onChangeDisplayCurrency("USDT")
              : undefined
          }
          active={displayCurrency === "USDT"}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-white/80">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500 dark:text-white/80" />
        <span>
          BTC ≈ ${rates.BTC_USD.toLocaleString()} · ₦
          {Math.round(rates.USD_NGN * rates.BTC_USD).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

interface BalanceChipProps {
  label: string;
  amount: number;
  currency: Currency;
  hidden: boolean;
  accent?: boolean;
  onSelect?: () => void;
  active?: boolean;
}

function BalanceChip({
  label,
  amount,
  currency,
  hidden,
  accent,
  onSelect,
  active,
}: BalanceChipProps) {
  // Uses the standard formatCurrency to show regular BTC decimals (e.g. ₿0.000020)
  const displayAmount = formatCurrency(amount, currency);

  const Inner = (
    <div
      className={`rounded-2xl p-3 text-left transition-all ${
        active
          ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200 dark:ring-none"
          : "bg-slate-200/50 hover:bg-slate-200/80 text-slate-700 dark:bg-white/15 dark:hover:bg-white/20 dark:text-white"
      } ${accent && !active ? "ring-1 ring-amber-500/30 dark:ring-white/30" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-80">
        {currency === "BTC" && (
          <Bitcoin className="h-3 w-3 text-amber-500 dark:text-inherit" />
        )}
        {label}
      </div>
      <div className="mt-1 text-sm md:text-base font-bold tabular-nums truncate">
        {hidden ? "•••••" : displayAmount}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="text-left w-full">
        {Inner}
      </button>
    );
  }
  return Inner;
}

export function BalanceCardSkeleton() {
  return (
    <div className="rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-none bg-slate-50 dark:bg-muted">
      <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-700" />
      <Skeleton className="mt-3 h-12 w-56 bg-slate-200 dark:bg-slate-700" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
