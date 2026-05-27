// src/hooks/usePreferences.ts — Server-backed user preferences
//
// Mirrors the AppConfig shape from AppProvider. When the user is logged
// in, preferences are loaded from /user/preferences and updates are
// persisted server-side. When logged out, behaviour falls back to the
// existing AppProvider (localStorage), so this hook is purely additive.

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";

export interface ServerPreferences {
  id: string;
  pubkey: string;
  theme: "dark" | "light" | "system";
  displayCurrency: "NGN" | "USD" | "USDT" | "BTC";
  useAppBlossomServers: boolean;
  simulatedOffline: boolean;
  relayMetadata: {
    relays: { url: string; read: boolean; write: boolean }[];
    updatedAt: number;
  };
  blossomServerMetadata: {
    servers: string[];
    updatedAt: number;
  };
}

export interface PreferencesPatch {
  theme?: ServerPreferences["theme"];
  displayCurrency?: ServerPreferences["displayCurrency"];
  useAppBlossomServers?: boolean;
  simulatedOffline?: boolean;
  relayMetadata?: ServerPreferences["relayMetadata"];
  blossomServerMetadata?: ServerPreferences["blossomServerMetadata"];
}

export function usePreferences() {
  const api = useApi();
  const qc  = useQueryClient();
  const key = ["user", "preferences", api.pubkey ?? ""] as const;

  const query = useQuery<ServerPreferences>({
    queryKey: key,
    queryFn:  () => api.get<ServerPreferences>("/user/preferences"),
    enabled:  api.isAuthenticated,
    staleTime: 60_000,
  });

  const updateMut = useMutation({
    mutationFn: (patch: PreferencesPatch) => api.put<ServerPreferences>("/user/preferences", patch),
    onSuccess:  () => qc.invalidateQueries({ queryKey: key }),
  });

  const resetMut = useMutation({
    mutationFn: () => api.post<Record<string, number>>("/user/account/reset", {}),
    onSuccess:  () => qc.invalidateQueries(), // nuke everything client-side
  });

  const update = useCallback((patch: PreferencesPatch) => updateMut.mutateAsync(patch), [updateMut]);
  const reset  = useCallback(() => resetMut.mutateAsync(), [resetMut]);

  return {
    preferences: query.data,
    isLoading:   query.isLoading,
    isError:     query.isError,
    enabled:     api.isAuthenticated,
    update,
    reset,
  };
}
