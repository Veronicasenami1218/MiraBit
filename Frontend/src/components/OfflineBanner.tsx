import { WifiOff, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

/**
 * Persistent banner shown when the device (or simulated mode) is offline.
 * Also auto-settles queued transactions when connectivity is restored.
 */
export function OfflineBanner() {
  const { isOnline, simulatedOffline } = useOnlineStatus();
  const { transactions, settleQueued } = useWallet();
  const { toast } = useToast();
  const wasOffline = useRef(!isOnline);

  const queuedCount = transactions.filter((t) => t.status === "queued").length;

  // Auto-settle queued txs when we come back online.
  useEffect(() => {
    if (isOnline && wasOffline.current && queuedCount > 0) {
      const settled = settleQueued();
      if (settled > 0) {
        toast({
          title: "Back online",
          description: `Synced ${settled} queued payment${settled === 1 ? "" : "s"}.`,
        });
      }
    }
    wasOffline.current = !isOnline;
  }, [isOnline, queuedCount, settleQueued, toast]);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-40 w-full border-b border-amber-300/50",
        "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
      )}
      role="status"
    >
      <div className="container max-w-5xl flex items-center justify-between gap-3 py-2 text-sm font-medium">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {simulatedOffline ? "Offline mode" : "You're offline"} —
            {queuedCount > 0
              ? ` ${queuedCount} payment${queuedCount === 1 ? "" : "s"} queued.`
              : " payments will queue and sync when you reconnect."}
          </span>
        </div>
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin opacity-60" />
      </div>
    </div>
  );
}
