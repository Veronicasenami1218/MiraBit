import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useLoginActions } from "@/hooks/useLoginActions";
import bip39 from "bip39";
import { nip19 } from "nostr-tools";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  Wallet,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  Gift,
  Eye,
  EyeOff,
} from "lucide-react";

interface SimpleAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export function SimpleAuthDialog({
  isOpen,
  onClose,
  redirectPath = "/app",
}: SimpleAuthDialogProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<"menu" | "create" | "restore" | "success">(
    "menu",
  );

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const api = useApi();
  const loginActions = useLoginActions();

  const handleCreateWallet = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = { name: username.trim() || undefined, pin };
      // Backend endpoint returns { keys: { mnemonic, npub, pubkeyHex }, wallet }
      // Use /wallet/generate for compatibility (backend accepts both)
      const res = await api.post<{
        keys?: { mnemonic?: string; npub?: string; pubkeyHex?: string };
        wallet?: unknown;
      }>(`/wallet/generate`, payload);

      const mnemonic = res?.keys?.mnemonic ?? "";
      const pubkeyHex = res?.keys?.pubkeyHex ?? "";

      if (!mnemonic) {
        throw new Error("Backend did not return a recovery mnemonic");
      }

      // Show the 12-word recovery phrase to the user and require copy/confirm
      setRecoveryPhrase(mnemonic);

      // Derive nsec from mnemonic so we can auto-login via NIP-98 on the client
      let derivedNsec: string | null = null;
      try {
        const seed = bip39.mnemonicToSeedSync(mnemonic); // Buffer
        const skHex = seed.slice(0, 32).toString("hex");
        derivedNsec = nip19.nsecEncode(skHex);
      } catch (err) {
        derivedNsec = null;
      }

      if (derivedNsec) {
        try {
          loginActions.nsec(derivedNsec);
          // allow a short moment for the nostr login state to propagate
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          // non-fatal
        }
      }

      // Warm the server-backed wallet cache by fetching the wallet resource.
      try {
        if (pubkeyHex) {
          await new Promise((r) => setTimeout(r, 200));
          await api.get(`/wallet/${pubkeyHex}`);
        }
      } catch {
        // ignore — fallback handled elsewhere
      }

      // Notify app and navigate into the app immediately after creation.
      try {
        window.dispatchEvent(new Event("mirabit_auth_update"));
      } catch {}
      setConfirmedSaved(false);
      navigate(redirectPath);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to generate wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBonus = () => {
    // User should already be logged in via NIP-98 (derived nsec). Just
    // navigate into the app and close the dialog. Notify listeners that
    // auth state may have changed so the UI can refresh wallet data.
    try {
      window.dispatchEvent(new Event("mirabit_auth_update"));
    } catch {}
    navigate(redirectPath);
    onClose();
  };

  const handleRestoreWallet = async () => {
    if (recoveryPhrase.trim().split(" ").length < 12) {
      setError("Recovery phrase must be at least 12 words.");
      return;
    }

    // Derive nsec from provided mnemonic and log in via NIP-98
    let derivedNsec: string | null = null;
    try {
      const seed = bip39.mnemonicToSeedSync(recoveryPhrase.trim());
      const skHex = seed.slice(0, 32).toString("hex");
      derivedNsec = nip19.nsecEncode(skHex);
    } catch (err) {
      derivedNsec = null;
    }

    if (derivedNsec) {
      try {
        loginActions.nsec(derivedNsec);
        // give the login hook a short moment to update global state
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        // ignore
      }
    }

    try {
      window.dispatchEvent(new Event("mirabit_auth_update"));
    } catch {}
    navigate(redirectPath);
    onClose();
  };

  const goBack = () => {
    setStep("menu");
    setError("");
    setPin("");
    setConfirmPin("");
    setUsername("");
    setRecoveryPhrase("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[90vw] max-w-[400px] rounded-[2rem] p-0 gap-0 overflow-hidden bg-background border-2 [&>button]:hidden"
        onInteractOutside={(e) => {
          e.preventDefault();
          onClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <DialogTitle className="sr-only">MiraBit Wallet</DialogTitle>
        <DialogDescription className="sr-only">
          Create or restore your MiraBit wallet. Keep your recovery phrase private and
          store it securely; it is required to recover your account.
        </DialogDescription>
        <div className="p-6 md:p-8">
          {step === "menu" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col items-center text-center">
              <div className="py-8 w-full mb-6 bg-muted/30 rounded-2xl border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-rose-100 opacity-50 dark:opacity-5" />
                <div className="relative flex items-center justify-center gap-4">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <Logo showWordmark={false} />
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Wallet className="h-8 w-8" />
                  </div>
                  <Sparkles className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                MiraBit Wallet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
                Incredibly simple, secure, and private Bitcoin wallet for modern
                users.
              </p>
              <div className="w-full mt-8 space-y-3">
                <Button
                  onClick={() => setStep("create")}
                  className="w-full h-12 text-base font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                >
                  Create wallet <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("restore")}
                  className="w-full h-12 text-base font-semibold rounded-2xl border-2"
                >
                  I already have a wallet
                </Button>
              </div>
            </div>
          )}

          {step === "create" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
              <h2 className="text-2xl font-bold text-center">
                Create Secure Wallet
              </h2>
              <div className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="e.g. Satoshi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <Label htmlFor="pin">Set PIN</Label>
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      placeholder="Enter PIN"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      className="h-12 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPin ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPin">Confirm PIN</Label>
                  <Input
                    id="confirmPin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    placeholder="Confirm PIN"
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    className="h-12 rounded-xl"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive font-medium text-center">
                    {error}
                  </p>
                )}

                <div className="pt-2 space-y-2">
                  <Button
                    onClick={handleCreateWallet}
                    className="w-full h-12 rounded-xl font-bold"
                  >
                    Generate Wallet
                  </Button>
                  <Button variant="ghost" onClick={goBack} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="animate-in zoom-in-95 duration-500 ease-out flex flex-col items-center text-center">
              {/* Fun little ping animation for the gift icon */}
              <div className="h-20 w-20 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 mb-6 relative">
                <div
                  className="absolute inset-0 animate-ping opacity-20 bg-orange-500 rounded-full"
                  style={{ animationDuration: "2s" }}
                />
                <Gift className="h-10 w-10 relative z-10" />
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight">
                Welcome aboard!
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Your secure wallet is ready. To get you started on your savings
                journey, we're giving you a free welcome bonus!
              </p>

              {/* Bonus Display Card */}
              <div className="mt-6 p-5 w-full bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-500/20 rounded-2xl flex flex-col items-center shadow-inner">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                  Sign-up Bonus
                </span>
                <span className="text-4xl font-black text-foreground tracking-tight">
                  2,000 Sats
                </span>
              </div>

              {/* Show recovery secret and require confirmation */}
              {recoveryPhrase ? (
                <div className="w-full mt-6 space-y-4">
                  <div className="p-4 rounded-xl border bg-muted/5 break-words text-sm">
                    <div className="font-medium text-xs text-muted-foreground mb-2">Recovery phrase (12 words)</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="select-all text-sm">{recoveryPhrase}</div>
                      <button
                        type="button"
                        onClick={async () => {
                          const text = recoveryPhrase;
                          let ok = false;
                          try {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              await navigator.clipboard.writeText(text);
                              ok = true;
                            }
                          } catch (e) {
                            ok = false;
                          }
                          if (!ok) {
                            // Fallback: create a textarea, select and execCopy
                            try {
                              const ta = document.createElement('textarea');
                              ta.value = text;
                              ta.setAttribute('readonly', '');
                              ta.style.position = 'absolute';
                              ta.style.left = '-9999px';
                              document.body.appendChild(ta);
                              ta.select();
                              const res = document.execCommand('copy');
                              document.body.removeChild(ta);
                              ok = res;
                            } catch {
                              ok = false;
                            }
                          }
                          if (ok) {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }
                        }}
                        className="ml-2 text-sm text-primary underline"
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmedSaved}
                      onChange={(e) => setConfirmedSaved(e.target.checked)}
                    />
                    <span>I have copied and securely stored this recovery key.</span>
                  </label>

                  <div className="w-full pt-2">
                    <Button
                      onClick={handleAcceptBonus}
                      disabled={!confirmedSaved}
                      className="w-full h-14 text-base font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Claim Bonus & Enter App
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full pt-8">
                  <Button
                    onClick={handleAcceptBonus}
                    className="w-full h-14 text-base font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/25 transition-all active:scale-95"
                  >
                    Claim Bonus & Enter App
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "restore" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
              <h2 className="text-2xl font-bold text-center">Restore Wallet</h2>
              <textarea
                placeholder="Enter 12-word recovery phrase..."
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                className="w-full mt-4 p-4 rounded-xl border min-h-[100px] resize-none"
              />
              {error && (
                <p className="text-sm text-destructive text-center mt-2">
                  {error}
                </p>
              )}
              <Button
                onClick={handleRestoreWallet}
                className="w-full mt-4 h-12 rounded-xl font-bold"
              >
                Restore
              </Button>
              <Button variant="ghost" onClick={goBack} className="w-full mt-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
