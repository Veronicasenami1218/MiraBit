// src/hooks/useLearn.ts — Lessons + per-user progress
//
// Lessons are fetched from /learn/lessons (public). Progress + completion
// require auth. When the user is logged out, this hook returns empty
// progress and a no-op completer so the LearnPage continues to function
// in demo mode.

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";

export interface LessonSummary {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  summary: string;
  content: string[];
  question: string;
  options: string[];
  rewardBtc: number;
  explanation: string;
  // answerIndex is NOT returned by the backend (server verifies).
}

export interface LearnProgress {
  completed: string[];
  earnedBtc: number;
  lastCompletedAt: number | null;
}

export interface CompleteResult {
  alreadyCompleted: boolean;
  awardedBtc: number;
  lesson: { id: string; title: string; explanation: string };
  progress: LearnProgress;
}

export function useLearn() {
  const api = useApi();
  const qc  = useQueryClient();

  const lessonsKey  = ["learn", "lessons"] as const;
  const progressKey = ["learn", "progress", api.pubkey ?? ""] as const;

  const lessonsQuery = useQuery<LessonSummary[]>({
    queryKey: lessonsKey,
    queryFn:  () => api.get<LessonSummary[]>("/learn/lessons"),
    staleTime: 24 * 60 * 60 * 1000, // 24h – content rarely changes
    enabled:   api.configured,
  });

  const progressQuery = useQuery<LearnProgress>({
    queryKey: progressKey,
    queryFn:  () => api.get<LearnProgress>("/learn/progress"),
    enabled:  api.isAuthenticated,
    staleTime: 30_000,
  });

  const completeMut = useMutation({
    mutationFn: (input: { lessonId: string; answerIndex: number }) =>
      api.post<CompleteResult>("/learn/complete", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: progressKey });
      // also invalidate wallet so the new BTC reward shows up immediately
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const complete = useCallback(
    (lessonId: string, answerIndex: number) => completeMut.mutateAsync({ lessonId, answerIndex }),
    [completeMut],
  );

  return {
    lessons:    lessonsQuery.data ?? [],
    progress:   progressQuery.data ?? { completed: [], earnedBtc: 0, lastCompletedAt: null },
    isLoading:  lessonsQuery.isLoading || progressQuery.isLoading,
    isError:    lessonsQuery.isError || progressQuery.isError,
    enabled:    api.isAuthenticated,
    complete,
  };
}
