// src/hooks/useOfflineQueue.ts — Server-side offline payment queue
//
// Used by:
//   - OfflineBanner: triggers a flush when the device returns online
//   - SettingsPage:  could surface pending count + manual flush button
//   - PayPage:       could show "you have N queued payments" badge

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { Currency } from "@/lib/mirabit";

export interface QueuedPayment {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  recipient: string;
  recipientType: "invoice" | "lnurl" | "onchain" | "handle" | "unknown";
  amount: number;
  sourceCurrency: Currency;
  amountSats: number | null;
  note: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  paymentHash: string | null;
  settledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlushSummary {
  processed: number;
  completed: number;
  failed: number;
  retried: number;
  items: QueuedPayment[];
}

export function useOfflineQueue() {
  const api = useApi();
  const qc  = useQueryClient();
  const key = ["payments", "queue", api.pubkey ?? ""] as const;

  const listQuery = useQuery<QueuedPayment[]>({
    queryKey: key,
    queryFn:  () => api.get<QueuedPayment[]>("/payments/queue"),
    enabled:  api.isAuthenticated,
    staleTime: 15_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["wallet"] }); // balances may have changed
  };

  const enqueueMut = useMutation({
    mutationFn: (input: {
      recipient: string;
      amount: number;
      sourceCurrency: Currency;
      note?: string;
    }) => api.post<QueuedPayment>("/payments/queue", input),
    onSuccess: invalidate,
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.delete<QueuedPayment>(`/payments/queue/${id}`),
    onSuccess:  invalidate,
  });

  const flushMut = useMutation({
    mutationFn: (batchSize?: number) =>
      api.post<FlushSummary>("/payments/queue/flush", batchSize ? { batchSize } : {}),
    onSuccess: invalidate,
  });

  const items = listQuery.data ?? [];
  const pendingCount = items.filter(
    (i) => i.status === "queued" || i.status === "processing",
  ).length;

  return {
    items,
    pendingCount,
    isLoading: listQuery.isLoading,
    enabled:   api.isAuthenticated,

    enqueue: useCallback(
      (input: { recipient: string; amount: number; sourceCurrency: Currency; note?: string }) =>
        enqueueMut.mutateAsync(input),
      [enqueueMut],
    ),
    cancel:  useCallback((id: string) => cancelMut.mutateAsync(id), [cancelMut]),
    flush:   useCallback((batchSize?: number) => flushMut.mutateAsync(batchSize), [flushMut]),
  };
}
