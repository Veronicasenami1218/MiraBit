// src/hooks/useSavingsGoals.ts — Server-backed savings goals CRUD
//
// Returns the same Goal shape that SavingsPage already uses, just sourced
// from the backend when the user is logged in. When not logged in, the
// hook simply returns an empty list and no-op mutators so the existing
// localStorage-based behaviour can continue.

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { Currency } from "@/lib/mirabit";

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  targetCurrency: Currency;
  savedBtc: number;
  isAchieved?: boolean;
  createdAt?: number;
}

export interface CreateGoalInput {
  name: string;
  emoji?: string;
  target: number;
  targetCurrency: Currency;
}

export interface UpdateGoalInput {
  name?: string;
  emoji?: string;
  target?: number;
  savedBtc?: number;
  isAchieved?: boolean;
}

export function useSavingsGoals() {
  const api = useApi();
  const qc  = useQueryClient();
  const enabled = api.isAuthenticated;

  const key = ["savings", "goals", api.pubkey ?? ""] as const;

  const query = useQuery<Goal[]>({
    queryKey: key,
    queryFn: () => api.get<Goal[]>("/savings/goals"),
    enabled,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createGoal = useMutation({
    mutationFn: (input: CreateGoalInput) => api.post<Goal>("/savings/goals", input),
    onSuccess:  invalidate,
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateGoalInput }) =>
      api.patch<Goal>(`/savings/goals/${id}`, patch),
    onSuccess:  invalidate,
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/savings/goals/${id}`),
    onSuccess:  invalidate,
  });

  const createAsync = useCallback((i: CreateGoalInput) => createGoal.mutateAsync(i), [createGoal]);
  const updateAsync = useCallback((id: string, patch: UpdateGoalInput) =>
    updateGoal.mutateAsync({ id, patch }), [updateGoal]);
  const deleteAsync = useCallback((id: string) => deleteGoal.mutateAsync(id), [deleteGoal]);

  return {
    goals:      query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    error:      query.error,
    enabled,
    createGoal: createAsync,
    updateGoal: updateAsync,
    deleteGoal: deleteAsync,
  };
}
