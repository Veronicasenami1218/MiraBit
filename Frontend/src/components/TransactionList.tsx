import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  PiggyBank,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type Transaction,
  CURRENCY_META,
  formatCurrency,
  relativeTime,
} from "@/lib/mirabit";

interface TransactionListProps {
  transactions: Transaction[];
  limit?: number;
  emptyHint?: string;
}

function txMeta(tx: Transaction) {
  switch (tx.type) {
    case "save":
      return { Icon: PiggyBank, label: "Saved", tone: "text-primary bg-primary/10" };
    case "pay":
      return { Icon: ArrowUpRight, label: "Paid", tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" };
    case "receive":
      return { Icon: ArrowDownLeft, label: "Received", tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" };
    case "convert":
      return { Icon: ArrowLeftRight, label: "Converted", tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" };
    case "learn-reward":
      return { Icon: Sparkles, label: "Reward", tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" };
  }
}

export function TransactionList({ transactions, limit, emptyHint }: TransactionListProps) {
  const items = limit ? transactions.slice(0, limit) : transactions;

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            {emptyHint ?? "No activity yet. Your savings and payments will appear here."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="divide-y rounded-2xl border bg-card overflow-hidden">
      {items.map((tx) => {
        const meta = txMeta(tx);
        const Icon = meta.Icon;
        const isPay = tx.type === "pay";
        const isReceive = tx.type === "receive" || tx.type === "learn-reward";

        return (
          <li
            key={tx.id}
            className="flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/40 transition-colors"
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${meta.tone}`}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="truncate">{tx.note ?? meta.label}</span>
                {tx.status === "queued" && (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                    <Clock className="h-3 w-3" /> Queued
                  </Badge>
                )}
                {tx.status === "completed" && tx.type === "pay" && tx.note?.includes("(synced)") && (
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Synced
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {meta.label}
                {tx.counterparty ? ` · ${tx.counterparty}` : ""}
                {" · "}
                {relativeTime(tx.createdAt)}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div
                className={`text-sm font-bold tabular-nums ${
                  isPay
                    ? "text-rose-600"
                    : isReceive
                    ? "text-emerald-600"
                    : "text-foreground"
                }`}
              >
                {isPay ? "-" : isReceive ? "+" : ""}
                {formatCurrency(isPay ? tx.fromAmount : tx.toAmount, isPay ? (tx.fromCurrency ?? tx.toCurrency) : tx.toCurrency)}
              </div>
              {tx.type === "convert" && tx.fromCurrency && (
                <div className="text-[11px] text-muted-foreground">
                  from {formatCurrency(tx.fromAmount, tx.fromCurrency)}{" "}
                  <span aria-hidden>·</span> {CURRENCY_META[tx.toCurrency].label}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
