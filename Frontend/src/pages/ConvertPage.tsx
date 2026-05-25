import { useState } from "react";
import { useSeoMeta } from "@unhead/react";
import { ArrowDownUp, Info, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallet } from "@/hooks/useWallet";
import { useRates } from "@/hooks/useRates";
import { useToast } from "@/hooks/useToast";
import { type Currency, CURRENCY_META, convert, formatCurrency } from "@/lib/mirabit";

const ALL: Currency[] = ["BTC", "NGN", "USDT"];

export default function ConvertPage() {
  useSeoMeta({
    title: "Convert — MiraBit",
    description: "Swap between Bitcoin, Naira and USDT instantly.",
  });

  const { wallet, convertFunds } = useWallet();
  const { rates } = useRates();
  const { toast } = useToast();

  const [from, setFrom] = useState<Currency>("NGN");
  const [to, setTo] = useState<Currency>("BTC");
  const [amount, setAmount] = useState("");

  const num = Number(amount);
  const received = num > 0 ? convert(num, from, to, rates) : 0;
  const balance = wallet[from];
  const canConvert = num > 0 && num <= balance && from !== to;

  const rateLine = (() => {
    const one = convert(1, from, to, rates);
    return `1 ${from} ≈ ${one.toLocaleString("en-US", {
      maximumFractionDigits: CURRENCY_META[to].decimals,
    })} ${to}`;
  })();

  const swap = () => {
    setFrom(to);
    setTo(from);
    setAmount("");
  };

  const handleConvert = () => {
    if (!canConvert) {
      toast({
        title: "Can't convert",
        description:
          from === to
            ? "Pick two different currencies."
            : num <= 0
            ? "Enter an amount above zero."
            : `Insufficient ${from} balance.`,
        variant: "destructive",
      });
      return;
    }
    try {
      convertFunds(from, to, num);
      toast({
        title: "Converted",
        description: `${formatCurrency(num, from)} → ${formatCurrency(received, to)}`,
      });
      setAmount("");
    } catch (e) {
      toast({ title: "Conversion failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Convert</h1>
        <p className="text-muted-foreground mt-1">
          Swap instantly between BTC, Naira and USDT at live rates.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-5 md:p-6 space-y-3">
          {/* From */}
          <div className="rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You send</span>
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="hover:text-primary"
              >
                Balance: {formatCurrency(balance, from)}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="h-12 text-2xl font-bold tabular-nums border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <Select value={from} onValueChange={(v) => setFrom(v as Currency)}>
                <SelectTrigger className="w-28 h-12 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL.map((c) => (
                    <SelectItem key={c} value={c} disabled={c === to}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-2 relative z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={swap}
              className="rounded-full h-10 w-10 bg-background shadow-md hover:rotate-180 transition-transform"
              aria-label="Swap currencies"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          {/* To */}
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You receive (estimated)</span>
              <span>Balance: {formatCurrency(wallet[to], to)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 text-2xl font-bold tabular-nums">
                {received.toLocaleString("en-US", {
                  maximumFractionDigits: CURRENCY_META[to].decimals,
                  minimumFractionDigits: 2,
                })}
              </div>
              <Select value={to} onValueChange={(v) => setTo(v as Currency)}>
                <SelectTrigger className="w-28 h-12 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL.map((c) => (
                    <SelectItem key={c} value={c} disabled={c === from}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> {rateLine}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Zap className="h-3 w-3" /> No fees in demo
            </span>
          </div>

          <Button
            onClick={handleConvert}
            disabled={!canConvert}
            size="lg"
            className="w-full h-12 text-base mt-2"
          >
            Convert {amount ? `${formatCurrency(num, from)} → ${to}` : ""}
          </Button>
        </CardContent>
      </Card>

      {/* Quick pairs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Popular pairs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          {[
            ["NGN", "BTC"],
            ["USDT", "BTC"],
            ["NGN", "USDT"],
            ["BTC", "NGN"],
            ["BTC", "USDT"],
            ["USDT", "NGN"],
          ].map(([a, b]) => {
            const A = a as Currency;
            const B = b as Currency;
            const sample = convert(1, A, B, rates);
            return (
              <button
                key={`${A}-${B}`}
                type="button"
                onClick={() => {
                  setFrom(A);
                  setTo(B);
                }}
                className="rounded-xl border p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-xs text-muted-foreground">{A} → {B}</div>
                <div className="text-sm font-semibold mt-1 tabular-nums truncate">
                  1 {A} = {sample.toLocaleString("en-US", { maximumFractionDigits: 6 })} {B}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
