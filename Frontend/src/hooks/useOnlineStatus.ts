import { useEffect, useState } from "react";

/**
 * Tracks `navigator.onLine`. Reactive via the browser's `online`/`offline`
 * events so the rest of the app can show banners, queue payments, etc.
 *
 * Also returns a `simulateOffline` toggle for the in-app "Offline mode" switch,
 * which lets students test queued payments without unplugging anything.
 */
export function useOnlineStatus() {
  const [navigatorOnline, setNavigatorOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  useEffect(() => {
    const onOnline = () => setNavigatorOnline(true);
    const onOffline = () => setNavigatorOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const isOnline = navigatorOnline && !simulatedOffline;
  return {
    isOnline,
    navigatorOnline,
    simulatedOffline,
    setSimulatedOffline,
  };
}
