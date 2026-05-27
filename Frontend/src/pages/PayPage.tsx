import { useState } from "react";
import { useSeoMeta } from "@unhead/react";
import {
  QrCode,
  Scan,
  Send,
  Copy,
  Check,
  WifiOff,
  Bitcoin,
  ArrowDownToLine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QRCodeCanvas } from "@/components/ui/qrcode";
import { useWallet } from "@/hooks/useWallet";
import { useRates } from "@/hooks/useRates";
import { useToast } from "@/hooks/useToast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { convert, formatCurrency } from "@/lib/mirabit";

// Demo "receive address" — a real client would request one from a wallet service.
const DEMO_RECEIVE_ADDRESS = "bc1qmirabit0studentpay0demoaddress0xyz789abcde";

export default function PayPage() {
  useSeoMeta({
    title: "Pay — MiraBit",
    description: "Send and receive Bitcoin with QR codes — works even when you're offline.",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pay</h1>
        <p className="text-muted-foreground mt-1">
          Send Bitcoin to anyone or scan a QR. Payments queue automatically when
          you're offline.
        </p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" /> Send
          </TabsTrigger>
          <TabsTrigger value="receive" className="gap-2">
            <ArrowDownToLine className="h-4 w-4" /> Receive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <SendPanel />
        </TabsContent>
        <TabsContent value="receive" className="mt-6">
          <ReceivePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SendPanel() {
  const { wallet, payBtc } = useWallet();
  const { rates } = useRates();
  const { toast } = useToast();
  const { isOnline, simulatedOffline, setSimulatedOffline } = useOnlineStatus();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const num = Number(amount);
  const ngnEq = num > 0 ? convert(num, "BTC", "NGN", rates) : 0;
  const canSend = num > 0 && recipient.trim().length > 4 && (isOnline ? num <= wallet.BTC : true);

  const handleSend = async () => {
    if (!canSend) {
      toast({
        title: "Can't send",
        description: !recipient
          ? "Add a recipient address or handle."
          : num <= 0
          ? "Enter an amount above zero."
          : "Insufficient BTC balance.",
        variant: "destructive",
      });
      return;
    }
    try {
      const tx = await payBtc(num, recipient, isOnline, note || undefined);
      if (tx.status === "queued") {
        toast({
          title: "Payment queued",
          description: "We'll send this as soon as you're back online.",
        });
      } else {
        toast({
          title: "Payment sent",
          description: `${num.toFixed(8)} ₿ to ${recipient.slice(0, 10)}…`,
        });
      }
      setAmount("");
      setNote("");
      setRecipient("");
    } catch (e) {
      toast({ title: "Payment failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-primary" /> Send Bitcoin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="pay-recipient">Recipient</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="pay-recipient"
                placeholder="bc1… address, lightning invoice, or @handle"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setScanOpen(true)} type="button">
                <Scan className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pay-amount">Amount (BTC)</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setAmount(String(wallet.BTC))}
                >
                  Max {wallet.BTC.toFixed(6)} ₿
                </button>
              </div>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₿
                </span>
                <Input
                  id="pay-amount"
                  inputMode="decimal"
                  placeholder="0.00000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 pl-7 text-lg font-semibold tabular-nums"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                ≈ {formatCurrency(ngnEq, "NGN")}
              </p>
            </div>
            <div>
              <Label htmlFor="pay-note">Note (optional)</Label>
              <Textarea
                id="pay-note"
                placeholder="What's it for?"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Offline simulator */}
          <div className="rounded-xl border border-dashed p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <WifiOff className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Offline mode</div>
                <div className="text-xs text-muted-foreground">
                  Queue this payment as if you had no internet.
                </div>
              </div>
            </div>
            <Switch checked={simulatedOffline} onCheckedChange={setSimulatedOffline} />
          </div>

          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="lg"
            className="w-full h-12 text-base"
          >
            {isOnline ? (
              <>
                <Send className="h-5 w-5 mr-2" /> Send {amount && `${num.toFixed(8)} ₿`}
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 mr-2" /> Queue payment
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/50 dark:border-emerald-900/40">
        <CardHeader>
          <CardTitle className="text-base">Pay tips for students</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>• Always double-check the first and last 4 characters of the address.</p>
          <p>• Small test sends are safe — Bitcoin is divisible to 8 decimals.</p>
          <p>• Queued payments are saved locally and sync automatically when you reconnect.</p>
        </CardContent>
      </Card>

      {/* Mock scanner */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR code</DialogTitle>
            <DialogDescription>
              Point your camera at a Bitcoin QR. (Demo: pick one of the sample
              addresses below.)
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-square rounded-2xl bg-muted flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-6 border-2 border-primary/60 rounded-2xl" />
            <div className="absolute inset-6 border-l-4 border-t-4 border-primary rounded-tl-2xl w-12 h-12" />
            <div className="absolute inset-6 border-r-4 border-t-4 border-primary rounded-tr-2xl w-12 h-12 ml-auto right-0" style={{ left: 'auto' }} />
            <QrCode className="h-16 w-16 text-muted-foreground/40" />
            <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground">
              Camera scanner placeholder
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "Campus Bookstore", addr: "bc1qbookstore0addressexample123456789" },
              { label: "Cafeteria @lunchspot", addr: "bc1qcafeteria0demo0address0987654321xyz" },
            ].map((opt) => (
              <button
                key={opt.addr}
                type="button"
                onClick={() => {
                  setRecipient(opt.addr);
                  setScanOpen(false);
                  toast({ title: `Scanned: ${opt.label}` });
                }}
                className="w-full text-left rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{opt.addr}</div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceivePanel() {
  const { rates } = useRates();
  const { toast } = useToast();
  const [requestAmount, setRequestAmount] = useState("");

  const num = Number(requestAmount);
  const qrValue = num > 0
    ? `bitcoin:${DEMO_RECEIVE_ADDRESS}?amount=${num}`
    : `bitcoin:${DEMO_RECEIVE_ADDRESS}`;

  const ngnEq = num > 0 ? convert(num, "BTC", "NGN", rates) : 0;

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_RECEIVE_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: "Address copied" });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Bitcoin address</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <QRCodeCanvas value={qrValue} size={200} className="rounded-md" />
          </div>
          <div className="w-full">
            <div className="rounded-xl bg-muted p-3 text-xs font-mono break-all text-center">
              {DEMO_RECEIVE_ADDRESS}
            </div>
            <Button variant="outline" className="w-full mt-3" onClick={copy}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy address"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request a specific amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="req-amount">Amount in BTC</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                ₿
              </span>
              <Input
                id="req-amount"
                inputMode="decimal"
                placeholder="0.00000000"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                className="h-12 pl-7 text-lg font-semibold tabular-nums"
              />
            </div>
            {num > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                ≈ {formatCurrency(ngnEq, "NGN")}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Add an amount and share the QR with whoever's paying you — the amount
            is encoded into the code.
          </p>
          <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            <span className="font-mono break-all">{qrValue}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
