// src/lib/api.ts — MiraBit backend HTTP client
//
// Provides:
//   - A typed `apiFetch` helper that talks to VITE_API_BASE_URL
//   - NIP-98 (kind 27235) request signing helper
//   - A normalised `ApiError` for predictable error handling
//
// Hooks (see src/hooks/useApi.ts) wrap these primitives with the current
// Nostr signer so individual call sites stay short.
//
// Auth scheme reference: https://github.com/nostr-protocol/nips/blob/master/98.md

import type { NostrSigner, NostrEvent } from "@nostrify/nostrify";

// ── Config ───────────────────────────────────────────────────────────────────

/** Resolved base URL (no trailing slash) or `null` when not configured. */
export const API_BASE_URL: string | null = (() => {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
})();

/** True if the frontend is wired to a backend. */
export const isApiConfigured = (): boolean => API_BASE_URL !== null;

// ── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isAuth(): boolean { return this.status === 401 || this.status === 403; }
  get isNotFound(): boolean { return this.status === 404; }
  get isValidation(): boolean { return this.status === 400 || this.status === 422; }
  get isServer(): boolean { return this.status >= 500; }
  get isNetwork(): boolean { return this.status === 0; }
}

// ── NIP-98 signer ────────────────────────────────────────────────────────────

/**
 * Build the value for `Authorization: Nostr <base64-event>`.
 *
 * The event MUST be:
 *   - kind 27235
 *   - tag ["u", "<full URL>"]
 *   - tag ["method", "<HTTP method uppercased>"]
 *   - created_at within ±60s of server time
 *
 * @param signer  – `user.signer` from `useCurrentUser()`
 * @param url     – the full request URL (origin + path + query)
 * @param method  – the HTTP method (GET, POST, ...)
 * @returns the header value, including the leading "Nostr "
 */
export async function buildNip98AuthHeader(
  signer: NostrSigner,
  url: string,
  method: string,
): Promise<string> {
  const event: NostrEvent = await signer.signEvent({
    kind: 27235,
    content: "",
    tags: [
      ["u", url],
      ["method", method.toUpperCase()],
    ],
    created_at: Math.floor(Date.now() / 1000),
  });

  // Base64-encode the JSON form of the signed event
  const json = JSON.stringify(event);
  const b64 = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf8").toString("base64");

  return `Nostr ${b64}`;
}

// ── Request options ──────────────────────────────────────────────────────────

export interface ApiRequestOptions {
  /** HTTP method – defaults to GET when `body` is omitted, POST otherwise. */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Will be JSON-stringified automatically. */
  body?: unknown;
  /** Query string params (appended to URL, only primitive values supported). */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Extra headers (merged on top of Content-Type + Authorization). */
  headers?: Record<string, string>;
  /** If provided, the request is NIP-98 signed with this signer. */
  signer?: NostrSigner;
  /** Optional AbortSignal. */
  signal?: AbortSignal;
}

// ── Core fetch helper ────────────────────────────────────────────────────────

/**
 * Make a request against the configured backend.
 *
 * Throws `ApiError` for any non-2xx response or network error.
 * The unwrapped `data` payload from the response envelope is returned on success.
 *
 *     { success: true, message, data, meta? }
 *
 * @template T  – expected `data` type
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "Backend API URL not configured (VITE_API_BASE_URL is empty).",
      0,
      "NO_API_URL",
    );
  }

  const method = (options.method || (options.body !== undefined ? "POST" : "GET")).toUpperCase();
  const normPath = path.startsWith("/") ? path : `/${path}`;

  // Build query string
  let qs = "";
  if (options.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v === null || v === undefined) continue;
      params.set(k, String(v));
    }
    const s = params.toString();
    if (s) qs = `?${s}`;
  }

  const url = `${API_BASE_URL}${normPath}${qs}`;

  // Build headers
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.signer) {
    headers["Authorization"] = await buildNip98AuthHeader(options.signer, url, method);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      credentials: "omit",
    });
  } catch (err) {
    // Network failure or aborted
    const msg = err instanceof Error ? err.message : "Network request failed";
    throw new ApiError(msg, 0, "NETWORK_ERROR");
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON response (rare, but possible on 5xx behind a proxy)
    if (!res.ok) {
      throw new ApiError(
        `Request failed (${res.status}) — non-JSON response`,
        res.status,
        "BAD_RESPONSE",
      );
    }
    return undefined as T;
  }

  const envelope = (payload as { success?: boolean; message?: string; data?: T; error?: unknown; errors?: unknown }) || {};

  if (!res.ok || envelope.success === false) {
    throw new ApiError(
      envelope.message || `Request failed (${res.status})`,
      res.status,
      undefined,
      envelope.errors ?? envelope.error,
    );
  }

  return (envelope.data as T) ?? (undefined as T);
}
