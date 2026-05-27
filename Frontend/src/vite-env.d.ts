/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the MiraBit backend API, including the version prefix.
   * Example: `http://localhost:5000/api/v1`
   *
   * When unset, hooks that talk to the backend fall back to the
   * client-side demo mode (localStorage).
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
