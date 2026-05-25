import { useState } from "react";
import { useSeoMeta } from "@unhead/react";
import { PiggyBank, Bitcoin, ArrowRight, TrendingUp, Coffee, BookOpen, Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useWallet } from "@/hooks/useWallet";
import { useRates } from "@/hooks/useRates";
import { useToast } from "@/hooks/useToast";
import { type Currency, CURRENCY_META, convert, formatCurrency } from "@/lib/mirabit";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  targetCurrency: Currency;
  savedBtc: number;
}

const DEFAULT_GOALS: Goal[] = [
  { id: "g1", name: "Textbooks", emoji: "📚", target: 50000, targetCurrency: "NGN", savedBtc: 0.0002 },
  { id: "g2", name: "Laptop fund", emoji: "💻", target: 400, targetCurrency: "USDT", savedBtc: 0.0004 },
];

export default function SavingsPage() {
  useSeoMeta({
    title: "Savings — MiraBit",
    description: "Save in Naira or USDT and grow your Bitcoin pot.",
  });

  const { wallet, saveToBtc } = useWallet();
  const { rates } = useRates();
  const { toast } = useToast();

  const [goals, setGoals] = useLocalStorage<Goal[]>("mirabit:goals:v1", DEFAULT_GOALS);

  const [fromCurrency, setFromCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState("");

  const num = Number(amount);
  const btcPreview = num > 0 ? convert(num, fromCurrency, "BTC", rates) : 0;
  const sourceBalance = wallet[fromCurrency];
  const canSave = num > 0 && num <= sourceBalance;

  const handleSave = (goalId?: string) => {
    if (!canSave) {
      toast({
        title: "Can't save right now",
        description: num <= 0 ? "Enter an amount above zero." : `Insufficient ${fromCurrency} balance.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const goal = goals.find((g) => g.id === goalId);
      saveToBtc(fromCurrency, num, goal?.name);
      // Update goal progress
      if (goalId) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId ? { ...g, savedBtc: g.savedBtc + btcPreview } : g,
          ),
        );
      }
      toast({
        title: "Saved to Bitcoin",
        description: `+${btcPreview.toFixed(8)} ₿ added to your savings.`,
      });
      setAmount("");
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Savings</h1>
        <p className="text-muted-foreground mt-1">
          Convert spare Naira or USDT into Bitcoin and watch your savings grow.
        </p>
      </div>

      {/* Hero summary */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <PiggyBank className="h-4 w-4" /> Total saved in Bitcoin
          </div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums">
              {wallet.BTC.toFixed(8)} <span className="text-primary">₿</span>
            </span>
            <span className="text-muted-foreground text-sm">
              ≈ {formatCurrency(convert(wallet.BTC, "BTC", "NGN", rates), "NGN")} ·{" "}
              {formatCurrency(convert(wallet.BTC, "BTC", "USDT", rates), "USDT")}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            BTC ≈ ${rates.BTC_USD.toLocaleString()} — your savings hold value over time
          </div>
        </div>
      </Card>

      {/* Save form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save now</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={fromCurrency} onValueChange={(v) => setFromCurrency(v as Currency)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="NGN">From Naira</TabsTrigger>
              <TabsTrigger value="USDT">From USDT</TabsTrigger>
            </TabsList>

            <TabsContent value="NGN" className="mt-4">
              <SaveAmountForm
                amount={amount}
                onAmountChange={setAmount}
                fromCurrency="NGN"
                balance={wallet.NGN}
                btcPreview={btcPreview}
                presets={[500, 1000, 5000, 10000]}
              />
            </TabsContent>
            <TabsContent value="USDT" className="mt-4">
              <SaveAmountForm
                amount={amount}
                onAmountChange={setAmount}
                fromCurrency="USDT"
                balance={wallet.USDT}
                btcPreview={btcPreview}
                presets={[1, 5, 10, 25]}
              />
            </TabsContent>
          </Tabs>

          <Button
            onClick={() => handleSave()}
            disabled={!canSave}
            size="lg"
            className="w-full mt-6 h-12 text-base"
          >
            <Bitcoin className="h-5 w-5 mr-2" />
            Save {amount ? `${CURRENCY_META[fromCurrency].symbol}${num.toLocaleString()}` : ""} to Bitcoin
          </Button>
        </CardContent>
      </Card>

      {/* Goals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Savings goals</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const targetBtc = convert(goal.target, goal.targetCurrency, "BTC", rates);
            const progress = Math.min(100, (goal.savedBtc / Math.max(targetBtc, 1e-12)) * 100);
            return (
              <Card key={goal.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                        {goal.emoji}
                      </div>
                      <div>
                        <div className="font-semibold">{goal.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Target: {formatCurrency(goal.target, goal.targetCurrency)}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="mt-4 h-2" />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{goal.savedBtc.toFixed(6)} ₿ saved</span>
                    <span>{targetBtc.toFixed(6)} ₿ needed</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    disabled={!canSave}
                    onClick={() => handleSave(goal.id)}
                  >
                    Add {amount ? `${CURRENCY_META[fromCurrency].symbol}${num.toLocaleString()}` : ""} to {goal.name}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Goal suggestions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { Icon: Coffee, name: "Coffee fund", emoji: "☕", target: 5000, currency: "NGN" as Currency },
            { Icon: BookOpen, name: "Course fees", emoji: "🎓", target: 100, currency: "USDT" as Currency },
            { Icon: Plane, name: "Travel", emoji: "✈️", target: 200000, currency: "NGN" as Currency },
          ].map((s) => (
            <button
              key={s.name}
              type="button"
              className="rounded-2xl border border-dashed p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => {
                if (goals.some((g) => g.name === s.name)) {
                  toast({ title: `${s.name} already exists` });
                  return;
                }
                setGoals((prev) => [
                  ...prev,
                  {
                    id: Math.random().toString(36).slice(2, 8),
                    name: s.name,
                    emoji: s.emoji,
                    target: s.target,
                    targetCurrency: s.currency,
                    savedBtc: 0,
                  },
                ]);
                toast({ title: `Added "${s.name}" goal` });
              }}
            >
              <s.Icon className="h-4 w-4 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">+ {s.name}</div>
              <div className="text-[11px] text-muted-foreground">
                Goal {formatCurrency(s.target, s.currency)}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

interface SaveAmountFormProps {
  amount: string;
  onAmountChange: (v: string) => void;
  fromCurrency: Currency;
  balance: number;
  btcPreview: number;
  presets: number[];
}

function SaveAmountForm({
  amount,
  onAmountChange,
  fromCurrency,
  balance,
  btcPreview,
  presets,
}: SaveAmountFormProps) {
  const meta = CURRENCY_META[fromCurrency];
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="save-amount">Amount</Label>
          <button
            type="button"
            onClick={() => onAmountChange(String(balance))}
            className="text-xs text-primary hover:underline"
          >
            Use max ({formatCurrency(balance, fromCurrency)})
          </button>
        </div>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
            {meta.symbol}
          </span>
          <Input
            id="save-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="h-14 pl-9 text-xl font-bold tabular-nums"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            onClick={() => onAmountChange(String(p))}
          >
            {meta.symbol}
            {p.toLocaleString()}
          </Button>
        ))}
      </div>

      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">You'll receive</div>
          <div className="text-xl font-bold text-primary tabular-nums mt-0.5">
            {btcPreview.toFixed(8)} ₿
          </div>
        </div>
        <Bitcoin className="h-8 w-8 text-primary opacity-50" />
      </div>
    </div>
  );
}
