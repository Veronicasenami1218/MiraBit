import { WifiOff, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWallet } from "@/hooks/useWallet";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

/**
 * Persistent banner shown when the device (or simulated mode) is offline.
 *
 * On reconnect it triggers TWO settlement paths:
 *   1. `settleQueued()` from useWallet — handles both the legacy local
 *      queue AND (when logged in) the server-side queue flush, since the
 *      backend-backed implementation of useWallet maps settleQueued to
 *      POST /payments/queue/flush.
 *   2. A direct `flush()` from useOfflineQueue as a belt-and-braces
 *      retry in case there are server-queued items that have no matching
 *      entry in the local `transactions` array (e.g. queued from another
 *      device, then this device came back online).
 */
export function OfflineBanner() {
  const { isOnline, simulatedOffline } = useOnlineStatus();
  const { transactions, settleQueued } = useWallet();
  const queue = useOfflineQueue();
  const { toast } = useToast();
  const [backendFallback, setBackendFallback] = useState(false);
  const wasOffline = useRef(!isOnline);

  // Combine queue counts from both sources – the UI shows whichever is larger
  const localQueued  = transactions.filter((t) => t.status === "queued").length;
  const queuedCount  = Math.max(localQueued, queue.pendingCount);

  // Auto-settle queued txs when we come back online.
  useEffect(() => {
    if (!isOnline || !wasOffline.current) {
      wasOffline.current = !isOnline;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        let settled = 0;

        if (localQueued > 0) {
          const r = await Promise.resolve(settleQueued());
          if (!cancelled) settled += (typeof r === "number" ? r : 0);
        }

        // Belt-and-braces: also call the server flush even if local thinks
        // nothing is queued (cross-device case). When useWallet is in
        // server-mode, settleQueued() already did this — second call is a
        // cheap no-op (returns processed=0).
        if (queue.enabled && queue.pendingCount > 0) {
          const r = await queue.flush();
          if (!cancelled) settled += r?.completed ?? 0;
        }

        if (settled > 0 && !cancelled) {
          toast({
            title:       "Back online",
            description: `Synced ${settled} queued payment${settled === 1 ? "" : "s"}.`,
          });
        }
      } catch (err) {
        if (!cancelled) {
          toast({
            title:       "Sync failed",
            description: err instanceof Error ? err.message : "Could not settle queued payments.",
            variant:     "destructive",
          });
        }
      }
    })();

    wasOffline.current = !isOnline;
    return () => { cancelled = true; };
    // We intentionally only run when isOnline transitions; queuedCount/etc are read above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Listen for the wallet fallback event dispatched by useWallet when the
  // backend read fails. Show a small banner so the user knows we're using
  // local demo data as a temporary fallback.
  useEffect(() => {
    const handler = () => setBackendFallback(true);
    const ratesHandler = () => setBackendFallback(true);
    window.addEventListener("mirabit_wallet_fallback", handler as EventListener);
    window.addEventListener("mirabit_rates_fallback", ratesHandler as EventListener);
    return () => window.removeEventListener("mirabit_wallet_fallback", handler as EventListener);
  }, []);

  if (isOnline && !backendFallback) return null;

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
            {backendFallback
              ? "Using local demo data — backend unavailable."
              : simulatedOffline
              ? "Offline mode"
              : "You're offline"}
            {queuedCount > 0
              ? ` ${queuedCount} payment${queuedCount === 1 ? "" : "s"} queued.`
              : backendFallback
              ? " The app will retry the server in the background and update when available."
              : " payments will queue and sync when you reconnect."}
          </span>
        </div>
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin opacity-60" />
      </div>
    </div>
  );
}
