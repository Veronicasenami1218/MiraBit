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
import { useState } from "react";
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

  const { wallet, transactions } = useWallet();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("NGN");

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">Welcome back 👋</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Let's grow your savings today.
        </h1>
      </div>

      <BalanceCard
        displayCurrency={displayCurrency}
        onChangeDisplayCurrency={setDisplayCurrency}
      />

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction to="/app/savings" label="Save" Icon={PiggyBank} tone="from-orange-500 to-rose-500" />
        <QuickAction to="/app/convert" label="Convert" Icon={ArrowLeftRight} tone="from-blue-500 to-violet-500" />
        <QuickAction to="/app/pay" label="Pay" Icon={QrCode} tone="from-emerald-500 to-teal-500" />
        <QuickAction to="/app/learn" label="Learn" Icon={GraduationCap} tone="from-amber-500 to-yellow-500" />
      </div>

      {/* Top up + low-balance helper */}
      <div className="grid md:grid-cols-2 gap-4">
        <TopUpCard />
        <SavingsTipCard balance={wallet.BTC} />
      </div>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/activity" className="gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <TransactionList transactions={transactions} limit={5} />
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
      className="group rounded-2xl border bg-card p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div
        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-semibold text-sm">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
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
      toast({ title: "Couldn't top up", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4 text-primary" />
          Top up your wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Fund your MiraBit wallet to start saving, paying or converting. (Demo
          mode adds funds instantly.)
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Add funds</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Top up wallet</DialogTitle>
              <DialogDescription>
                Choose a currency and amount. This is a simulated top-up for the
                demo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="topup-currency">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger id="topup-currency" className="mt-1.5">
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
                  <Label htmlFor="topup-amount">Amount</Label>
                  <Input
                    id="topup-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(currency === "NGN" ? [5000, 10000, 25000] : currency === "USDT" ? [10, 25, 50] : [0.0005, 0.001, 0.005]).map(
                  (v) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(String(v))}
                    >
                      +{CURRENCY_META[currency].symbol}
                      {v.toLocaleString()}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handle}>Confirm top-up</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SavingsTipCard({ balance }: { balance: number }) {
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-900/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Tip of the day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Even saving ₦500 a week into Bitcoin builds the habit. Small,
          consistent savings compound over time.
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Your BTC savings: <span className="font-semibold text-foreground">{balance.toFixed(6)} ₿</span>
          </span>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/app/savings">
              Save now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
