import { Link } from "react-router-dom";
import {
  PiggyBank,
  ArrowLeftRight,
  QrCode,
  GraduationCap,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSeoMeta } from "@unhead/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionList } from "@/components/TransactionList";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { type Currency, CURRENCY_META } from "@/lib/mirabit";

export default function Dashboard() {
  useSeoMeta({
    title: "MiraBit — Bitcoin savings for students",
    description:
      "Save with Naira or USDT, convert to Bitcoin, pay with QR codes and learn the basics — all in one app for students.",
  });

  const { wallet, transactions, deposit } = useWallet();
  const { toast } = useToast();

  // CHANGED: Default display currency is now BTC so the 2000 sats show immediately
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("BTC");

  const { user, name } = useCurrentUser();
  const firstName = name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Greeting */}
      <div>
        <p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">
          Welcome, {firstName} 👋
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
          Let's grow your savings today.
        </h1>
      </div>

      {/* Adaptive Balance Component */}
      <BalanceCard
        displayCurrency={displayCurrency}
        onChangeDisplayCurrency={setDisplayCurrency}
      />

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickAction
          to="/app/savings"
          label="Save"
          Icon={PiggyBank}
          tone="from-orange-500 to-rose-500"
        />
        <QuickAction
          to="/app/convert"
          label="Convert"
          Icon={ArrowLeftRight}
          tone="from-blue-500 to-violet-500"
        />
        <QuickAction
          to="/app/pay"
          label="Pay"
          Icon={QrCode}
          tone="from-emerald-500 to-teal-500"
        />
        <QuickAction
          to="/app/learn"
          label="Learn"
          Icon={GraduationCap}
          tone="from-amber-500 to-yellow-500"
        />
      </div>

      {/* Top up + low-balance helper panel */}
      <div className="grid md:grid-cols-2 gap-4">
        <TopUpCard />
        <SavingsTipCard balance={wallet.BTC} />
      </div>

      {/* Recent activity log stack */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent activity
          </h2>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slate-500 dark:text-muted-foreground hover:text-slate-900"
          >
            <Link to="/app/activity" className="gap-1 font-semibold text-xs">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <Card className="rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-800/50 shadow-sm">
          <CardContent className="p-0">
            <TransactionList transactions={transactions} limit={5} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function QuickAction({
  to,
  label,
  Icon,
  tone,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-card p-4 hover:shadow-md dark:hover:bg-slate-900/40 transition-all hover:-translate-y-0.5 duration-200"
    >
      <div
        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-sm`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-bold text-sm text-slate-900 dark:text-white">
        {label}
      </div>
      <div className="text-[11px] text-slate-400 dark:text-muted-foreground mt-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
        Tap to open
      </div>
    </Link>
  );
}

function TopUpCard() {
  const { deposit } = useWallet();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState("");
  const { toast } = useToast();

  const handle = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      deposit(currency, num, "Demo top-up");
      toast({
        title: "Top-up successful",
        description: `Added ${CURRENCY_META[currency].symbol}${num.toLocaleString()} to your wallet.`,
      });
      setAmount("");
      setOpen(false);
    } catch (e) {
      toast({
        title: "Couldn't top up",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/50 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Plus className="h-4 w-4 text-orange-500" />
          Top up your wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-muted-foreground leading-relaxed">
          Fund your MiraBit wallet to start saving, paying or converting. (Demo
          mode adds funds instantly.)
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-11 font-bold rounded-xl shadow-sm bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              Add funds
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-lg">
                Top up wallet
              </DialogTitle>
              <DialogDescription>
                Choose a currency and amount. This is a simulated top-up for the
                demo sandbox environment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="topup-currency"
                    className="font-semibold text-xs"
                  >
                    Currency
                  </Label>
                  <Select
                    value={currency}
                    onValueChange={(v) => setCurrency(v as Currency)}
                  >
                    <SelectTrigger
                      id="topup-currency"
                      className="mt-1.5 h-11 rounded-xl"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">Naira (₦)</SelectItem>
                      <SelectItem value="USDT">USDT ($)</SelectItem>
                      <SelectItem value="BTC">Bitcoin (₿)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="topup-amount"
                    className="font-semibold text-xs"
                  >
                    Amount
                  </Label>
                  <Input
                    id="topup-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(currency === "NGN"
                  ? [5000, 10000, 25000]
                  : currency === "USDT"
                    ? [10, 25, 50]
                    : [0.0005, 0.001, 0.005]
                ).map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(v))}
                    className="rounded-lg h-8 text-[11px] font-bold"
                  >
                    +{CURRENCY_META[currency].symbol}
                    {v.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-xl h-11 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handle}
                className="rounded-xl h-11 font-bold bg-orange-500 hover:bg-orange-600 text-white"
              >
                Confirm top-up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SavingsTipCard({ balance }: { balance: number }) {
  return (
    <Card className="rounded-2xl bg-gradient-to-br from-orange-50/50 to-amber-50/40 dark:from-orange-950/20 dark:to-amber-950/10 border-orange-200/40 dark:border-orange-900/30 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-orange-600 dark:text-orange-400">
          <Sparkles className="h-4 w-4" />
          Tip of the day
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-muted-foreground leading-relaxed">
          Even saving ₦500 a week into Bitcoin builds the habit. Small,
          consistent savings compound over time.
        </p>
        <div className="mt-1 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/40 pt-3">
          <span className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
            Your BTC savings:{" "}
            <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
              {balance.toFixed(6)} ₿
            </span>
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 h-8 rounded-lg text-orange-600 dark:text-orange-400 hover:text-orange-700 font-bold text-xs px-2.5"
          >
            <Link to="/app/savings">
              Save now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
