import { useState, useMemo } from "react";
import { useSeoMeta } from "@unhead/react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TransactionList } from "@/components/TransactionList";
import { useWallet } from "@/hooks/useWallet";
import type { TxType } from "@/lib/mirabit";

const FILTERS: Array<{ value: "all" | TxType; label: string }> = [
  { value: "all", label: "All" },
  { value: "save", label: "Savings" },
  { value: "pay", label: "Payments" },
  { value: "convert", label: "Conversions" },
  { value: "receive", label: "Received" },
];

export default function ActivityPage() {
  useSeoMeta({
    title: "Activity — MiraBit",
    description: "All your savings, payments, conversions and rewards.",
  });

  const { transactions } = useWallet();
  const [filter, setFilter] = useState<"all" | TxType>("all");

  const filtered = useMemo(
    () =>
      filter === "all" ? transactions : transactions.filter((t) => t.type === filter),
    [transactions, filter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground mt-1">
          A complete history of everything that's moved through your wallet.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <TransactionList transactions={filtered} />
    </div>
  );
}
