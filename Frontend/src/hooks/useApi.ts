// src/hooks/useApi.ts — convenience hook bound to the current Nostr user
//
// Returns a small object with HTTP helpers that automatically include
// a NIP-98 signed Authorization header when the user is logged in.
//
// Usage:
//   const api = useApi();
//   const wallet = await api.get<Wallet>(`/wallet/${pubkey}`);
//   const tx     = await api.post(`/wallet/${pubkey}/deposit`, { currency:"NGN", amount:5000 });

import { useCallback, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  apiFetch,
  isApiConfigured,
  type ApiRequestOptions,
} from "@/lib/api";

export interface UseApiResult {
  /** True when VITE_API_BASE_URL is set. */
  configured: boolean;
  /** True when both API is configured AND a Nostr user is logged in. */
  isAuthenticated: boolean;
  /** Currently logged-in pubkey, normalised to lowercase. Null when logged out. */
  pubkey: string | null;

  /** Low-level: arbitrary method. */
  request: <T = unknown>(path: string, options?: ApiRequestOptions) => Promise<T>;

  get:    <T = unknown>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) => Promise<T>;
  post:   <T = unknown>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) => Promise<T>;
  put:    <T = unknown>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) => Promise<T>;
  patch:  <T = unknown>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) => Promise<T>;
  delete: <T = unknown>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) => Promise<T>;
}

export function useApi(): UseApiResult {
  const { user } = useCurrentUser();

  const pubkey = useMemo(
    () => (user?.pubkey ? user.pubkey.toLowerCase() : null),
    [user?.pubkey],
  );

  const signer = user?.signer;
  const configured = isApiConfigured();
  const isAuthenticated = configured && !!signer;

  const request = useCallback(
    <T = unknown>(path: string, options: ApiRequestOptions = {}) => {
      // Attach the signer by default; caller can override by passing signer:undefined
      const opts: ApiRequestOptions = {
        ...options,
        signer: options.signer !== undefined ? options.signer : signer,
      };
      return apiFetch<T>(path, opts);
    },
    [signer],
  );

  const get    = useCallback(<T = unknown>(p: string, o?: Omit<ApiRequestOptions, "method" | "body">) =>
    request<T>(p, { ...o, method: "GET" }), [request]);
  const post   = useCallback(<T = unknown>(p: string, b?: unknown, o?: Omit<ApiRequestOptions, "method" | "body">) =>
    request<T>(p, { ...o, method: "POST", body: b }), [request]);
  const put    = useCallback(<T = unknown>(p: string, b?: unknown, o?: Omit<ApiRequestOptions, "method" | "body">) =>
    request<T>(p, { ...o, method: "PUT", body: b }), [request]);
  const patch  = useCallback(<T = unknown>(p: string, b?: unknown, o?: Omit<ApiRequestOptions, "method" | "body">) =>
    request<T>(p, { ...o, method: "PATCH", body: b }), [request]);
  const del    = useCallback(<T = unknown>(p: string, o?: Omit<ApiRequestOptions, "method" | "body">) =>
    request<T>(p, { ...o, method: "DELETE" }), [request]);

  return {
    configured,
    isAuthenticated,
    pubkey,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}
