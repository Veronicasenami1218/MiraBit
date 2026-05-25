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

  const totalInDisplay =
    convert(wallet.BTC, "BTC", displayCurrency, rates) +
    convert(wallet.NGN, "NGN", displayCurrency, rates) +
    convert(wallet.USDT, "USDT", displayCurrency, rates);

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-xl">
      {/* Layered gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(28 96% 54%) 0%, hsl(18 92% 48%) 55%, hsl(340 80% 50%) 100%)",
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 0%, white 0px, transparent 40%), radial-gradient(circle at 0% 100%, white 0px, transparent 35%)",
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Total balance
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl md:text-5xl font-extrabold tracking-tight tabular-nums">
              {hidden ? "••••••" : formatCurrency(totalInDisplay, displayCurrency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/70">
            in {displayCurrency} · live rate updated periodically
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/15 shrink-0"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
        >
          {hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <BalanceChip
          label="Bitcoin"
          amount={wallet.BTC}
          currency="BTC"
          hidden={hidden}
          accent
          onSelect={onChangeDisplayCurrency ? () => onChangeDisplayCurrency("BTC") : undefined}
          active={displayCurrency === "BTC"}
        />
        <BalanceChip
          label="Naira"
          amount={wallet.NGN}
          currency="NGN"
          hidden={hidden}
          onSelect={onChangeDisplayCurrency ? () => onChangeDisplayCurrency("NGN") : undefined}
          active={displayCurrency === "NGN"}
        />
        <BalanceChip
          label="USDT"
          amount={wallet.USDT}
          currency="USDT"
          hidden={hidden}
          onSelect={onChangeDisplayCurrency ? () => onChangeDisplayCurrency("USDT") : undefined}
          active={displayCurrency === "USDT"}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/80">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>
          BTC ≈ ${rates.BTC_USD.toLocaleString()} · ₦{Math.round(rates.USD_NGN * rates.BTC_USD).toLocaleString()}
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

function BalanceChip({ label, amount, currency, hidden, accent, onSelect, active }: BalanceChipProps) {
  const Inner = (
    <div
      className={`rounded-2xl p-3 text-left transition-all ${
        active ? "bg-white text-slate-900 shadow-md" : "bg-white/15 hover:bg-white/20 text-white"
      } ${accent && !active ? "ring-1 ring-white/30" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-80">
        {currency === "BTC" && <Bitcoin className="h-3 w-3" />}
        {label}
      </div>
      <div className="mt-1 text-sm md:text-base font-bold tabular-nums truncate">
        {hidden ? "•••••" : formatCurrency(amount, currency)}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="text-left">
        {Inner}
      </button>
    );
  }
  return Inner;
}

export function BalanceCardSkeleton() {
  return (
    <div className="rounded-3xl p-6 md:p-8 bg-muted">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-12 w-56" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}
