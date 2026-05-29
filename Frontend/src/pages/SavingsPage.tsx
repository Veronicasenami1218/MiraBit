import { useState } from "react";
import { useSeoMeta } from "@unhead/react";
import {
  PiggyBank,
  Bitcoin,
  ArrowRight,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  type Currency,
  CURRENCY_META,
  convert,
  formatCurrency,
} from "@/lib/mirabit";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  targetCurrency: Currency;
  savedBtc: number;
}

type DurationUnit = "weeks" | "months" | "years";
type Frequency = "daily" | "weekly" | "monthly";

interface GoalDraft {
  suggestion: (typeof SUGGESTION_LIST)[number];
  name: string;
  target: number;
  targetCurrency: Currency;
  duration: number;
  durationUnit: DurationUnit;
  frequency: Frequency;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTION_LIST = [
  {
    icon: "📶",
    name: "Data bundle",
    hint: "Monthly internet",
    defaultTarget: 5000,
    currency: "NGN" as Currency,
  },
  {
    icon: "💻",
    name: "Laptop",
    hint: "New or upgrade",
    defaultTarget: 500,
    currency: "USDT" as Currency,
  },
  {
    icon: "📚",
    name: "Textbooks",
    hint: "Semester books",
    defaultTarget: 30000,
    currency: "NGN" as Currency,
  },
  {
    icon: "☕",
    name: "Coffee fund",
    hint: "Daily fuel",
    defaultTarget: 3000,
    currency: "NGN" as Currency,
  },
  {
    icon: "📝",
    name: "Past questions",
    hint: "Exam prep",
    defaultTarget: 8000,
    currency: "NGN" as Currency,
  },
  {
    icon: "🎓",
    name: "Online course",
    hint: "Udemy, Coursera",
    defaultTarget: 50,
    currency: "USDT" as Currency,
  },
  {
    icon: "✈️",
    name: "Travel",
    hint: "Trip or vacation",
    defaultTarget: 200000,
    currency: "NGN" as Currency,
  },
  {
    icon: "📱",
    name: "New phone",
    hint: "Upgrade device",
    defaultTarget: 150000,
    currency: "NGN" as Currency,
  },
  {
    icon: "🛡️",
    name: "Emergency fund",
    hint: "Safety net",
    defaultTarget: 100000,
    currency: "NGN" as Currency,
  },
  {
    icon: "✨",
    name: "Custom goal",
    hint: "Name your own",
    defaultTarget: 0,
    currency: "NGN" as Currency,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPerPeriod(
  target: number,
  duration: number,
  unit: DurationUnit,
  freq: Frequency,
): number {
  const weeksMap: Record<DurationUnit, number> = {
    weeks: 1,
    months: 4.33,
    years: 52,
  };
  const freqPerWeek: Record<Frequency, number> = {
    daily: 7,
    weekly: 1,
    monthly: 0.25,
  };
  const totalPeriods = Math.max(
    1,
    Math.round(duration * weeksMap[unit] * freqPerWeek[freq]),
  );
  return target / totalPeriods;
}

function periodLabel(freq: Frequency): string {
  return freq === "daily" ? "day" : freq === "weekly" ? "week" : "month";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavingsPage() {
  useSeoMeta({
    title: "Savings — MiraBit",
    description: "Save in Naira or USDT and grow your Bitcoin pot.",
  });

  const { wallet, saveToBtc } = useWallet();
  const { rates } = useRates();
  const { toast } = useToast();

  // v2 key — clears any stale goals from the old default-seeded v1 cache
  const [goals, setGoals] = useLocalStorage<Goal[]>("mirabit:goals:v2", []);
  const [fromCurrency, setFromCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState("");
  const [draftGoal, setDraftGoal] = useState<GoalDraft | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const num = Number(amount);

  // BTC preview: if already saving from BTC, preview === input amount
  const btcPreview =
    num > 0
      ? fromCurrency === "BTC"
        ? num
        : convert(num, fromCurrency, "BTC", rates)
      : 0;

  // Tolerate tiny floating-point drift on BTC balance comparisons
  const sourceBalance = wallet[fromCurrency] ?? 0;
  const canSave = num > 0 && num <= sourceBalance + 1e-10;

  const handleSave = (goalId?: string) => {
    if (!canSave) {
      toast({
        title: "Can't save right now",
        description:
          num <= 0
            ? "Enter an amount above zero."
            : `Insufficient ${fromCurrency} balance.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const goal = goals.find((g) => g.id === goalId);
      saveToBtc(fromCurrency, num, goal?.name);
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
      toast({
        title: "Save failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleAddGoal = () => {
    if (!draftGoal) return;
    const finalName =
      draftGoal.suggestion.name === "Custom goal"
        ? draftGoal.name.trim()
        : draftGoal.name;
    if (goals.some((g) => g.name === finalName)) {
      toast({ title: `"${finalName}" already exists` });
      return;
    }
    setGoals((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 8),
        name: finalName,
        emoji: draftGoal.suggestion.icon,
        target: draftGoal.target,
        targetCurrency: draftGoal.targetCurrency,
        savedBtc: 0,
      },
    ]);
    toast({ title: `"${finalName}" goal added!` });
    setDraftGoal(null);
  };

  const handleDeleteGoal = (reached: boolean) => {
    if (!deleteGoalId) return;
    const goal = goals.find((g) => g.id === deleteGoalId);
    setGoals((prev) => prev.filter((g) => g.id !== deleteGoalId));
    toast({
      title: reached ? "🎉 Congrats!" : "Goal removed",
      description: reached
        ? `You crushed your "${goal?.name}" goal!`
        : `"${goal?.name}" has been removed.`,
    });
    setDeleteGoalId(null);
  };

  const goalToDelete = goals.find((g) => g.id === deleteGoalId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Savings
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert spare Naira, USDT, or Bitcoin into your savings goals.
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
              ≈{" "}
              {formatCurrency(convert(wallet.BTC, "BTC", "NGN", rates), "NGN")}{" "}
              ·{" "}
              {formatCurrency(
                convert(wallet.BTC, "BTC", "USDT", rates),
                "USDT",
              )}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            BTC ≈ ${rates.BTC_USD.toLocaleString()} — your savings hold value
            over time
          </div>
        </div>
      </Card>

      {/* Goals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Savings goals</h2>
        </div>

        {/* Active goal cards */}
        {goals.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {goals.map((goal) => {
              const targetBtc = convert(
                goal.target,
                goal.targetCurrency,
                "BTC",
                rates,
              );
              const progress = Math.min(
                100,
                (goal.savedBtc / Math.max(targetBtc, 1e-12)) * 100,
              );
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
                            Target:{" "}
                            {formatCurrency(goal.target, goal.targetCurrency)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          {Math.round(progress)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteGoalId(goal.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                          aria-label="Remove goal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                      Add{" "}
                      {amount
                        ? `${CURRENCY_META[fromCurrency].symbol}${
                            fromCurrency === "BTC"
                              ? num.toFixed(8)
                              : num.toLocaleString()
                          }`
                        : ""}{" "}
                      to {goal.name}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Suggestion grid */}
        <p className="text-xs text-muted-foreground mb-3">
          What are you saving for?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SUGGESTION_LIST.map((s) => {
            const alreadyAdded = goals.some((g) => g.name === s.name);
            return (
              <button
                key={s.name}
                type="button"
                disabled={alreadyAdded}
                className={[
                  "rounded-2xl border p-3 text-left transition-colors",
                  alreadyAdded
                    ? "border-primary/30 bg-primary/5 opacity-50 cursor-not-allowed"
                    : "border-dashed hover:border-primary hover:bg-primary/5",
                ].join(" ")}
                onClick={() => {
                  if (alreadyAdded) return;
                  setDraftGoal({
                    suggestion: s,
                    name: s.name === "Custom goal" ? "" : s.name,
                    target: s.defaultTarget,
                    targetCurrency: s.currency,
                    duration: 3,
                    durationUnit: "months",
                    frequency: "weekly",
                  });
                }}
              >
                <div className="text-xl">{s.icon}</div>
                <div className="mt-2 text-sm font-medium">
                  {alreadyAdded ? "✓ " : "+ "}
                  {s.name}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {s.hint}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Goal setup dialog */}
      <Dialog
        open={!!draftGoal}
        onOpenChange={(open) => {
          if (!open) setDraftGoal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{draftGoal?.suggestion.icon}</span>
              Set up your goal
            </DialogTitle>
          </DialogHeader>

          {draftGoal && (
            <div className="space-y-4 pt-1">
              {draftGoal.suggestion.name === "Custom goal" && (
                <div className="space-y-1.5">
                  <Label>Goal name</Label>
                  <Input
                    placeholder="e.g. New sneakers"
                    value={draftGoal.name}
                    onChange={(e) =>
                      setDraftGoal((d) => d && { ...d, name: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={draftGoal.target || ""}
                    onChange={(e) =>
                      setDraftGoal(
                        (d) => d && { ...d, target: Number(e.target.value) },
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select
                    value={draftGoal.targetCurrency}
                    onValueChange={(v) =>
                      setDraftGoal(
                        (d) => d && { ...d, targetCurrency: v as Currency },
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="USDT">USDT ($)</SelectItem>
                      <SelectItem value="BTC">BTC (₿)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="3"
                    value={draftGoal.duration || ""}
                    onChange={(e) =>
                      setDraftGoal(
                        (d) => d && { ...d, duration: Number(e.target.value) },
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Period</Label>
                  <Select
                    value={draftGoal.durationUnit}
                    onValueChange={(v) =>
                      setDraftGoal(
                        (d) => d && { ...d, durationUnit: v as DurationUnit },
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>How often will you save?</Label>
                <Select
                  value={draftGoal.frequency}
                  onValueChange={(v) =>
                    setDraftGoal(
                      (d) => d && { ...d, frequency: v as Frequency },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {draftGoal.target > 0 && draftGoal.duration > 0 && (
                <div className="rounded-xl bg-muted/60 p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total goal</span>
                    <span className="text-foreground font-medium">
                      {formatCurrency(
                        draftGoal.target,
                        draftGoal.targetCurrency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Duration</span>
                    <span className="text-foreground font-medium">
                      {draftGoal.duration} {draftGoal.durationUnit}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Save per {periodLabel(draftGoal.frequency)}</span>
                    <span className="text-primary">
                      {formatCurrency(
                        calcPerPeriod(
                          draftGoal.target,
                          draftGoal.duration,
                          draftGoal.durationUnit,
                          draftGoal.frequency,
                        ),
                        draftGoal.targetCurrency,
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDraftGoal(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    !draftGoal.target ||
                    !draftGoal.duration ||
                    (draftGoal.suggestion.name === "Custom goal" &&
                      !draftGoal.name.trim())
                  }
                  onClick={handleAddGoal}
                >
                  Add goal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete / goal-reached dialog */}
      <Dialog
        open={!!deleteGoalId}
        onOpenChange={(open) => {
          if (!open) setDeleteGoalId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 pt-4 pb-2">
            <div className="text-6xl">😔</div>
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                Removing "{goalToDelete?.name}"
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Have you reached your goal of{" "}
              <span className="font-semibold text-foreground">
                {goalToDelete
                  ? formatCurrency(
                      goalToDelete.target,
                      goalToDelete.targetCurrency,
                    )
                  : ""}
              </span>
              ?
            </p>
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <Button className="w-full" onClick={() => handleDeleteGoal(true)}>
              🎉 Yes, I reached my goal!
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleDeleteGoal(false)}
            >
              No, just remove it
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setDeleteGoalId(null)}
            >
              Keep saving
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Save amount form ─────────────────────────────────────────────────────────

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
  const isBtc = fromCurrency === "BTC";
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
            placeholder={isBtc ? "0.00000000" : "0.00"}
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
            {isBtc ? p.toFixed(4) : p.toLocaleString()}
          </Button>
        ))}
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">
            {isBtc ? "Saving directly in" : "You'll receive"}
          </div>
          <div className="text-xl font-bold text-primary tabular-nums mt-0.5">
            {isBtc ? "Bitcoin ₿" : `${btcPreview.toFixed(8)} ₿`}
          </div>
        </div>
        <Bitcoin className="h-8 w-8 text-primary opacity-50" />
      </div>
    </div>
  );
}
