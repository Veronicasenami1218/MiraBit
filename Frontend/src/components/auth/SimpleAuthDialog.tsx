import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

  // Wallet creation states
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  // Wallet restoration state
  const [recoveryPhrase, setRecoveryPhrase] = useState("");

  const [error, setError] = useState("");

  const handleCreateWallet = () => {
    if (pin.length !== 4) {
      setError("Please enter a 4-digit PIN.");
      return;
    }
    setError("");
    // Move to the congratulatory bonus screen instead of closing immediately
    setStep("success");
  };

  const handleAcceptBonus = () => {
    // Save to local storage and officially let them into the app
    localStorage.setItem(
      "mirabit_user",
      JSON.stringify({
        name: username.trim() || "Anon Satoshi",
        pin: pin,
        signupBonus: 2000,
        isNew: true,
      }),
    );
    window.dispatchEvent(new Event("mirabit_auth_update"));
    navigate(redirectPath); // Redirects to the specifically requested page!
    onClose();
  };

  const handleRestoreWallet = () => {
    if (recoveryPhrase.trim().split(" ").length < 12) {
      setError("Recovery phrase must be at least 12 words.");
      return;
    }

    localStorage.setItem(
      "mirabit_user",
      JSON.stringify({
        name: "Restored User",
        isNew: false,
      }),
    );
    window.dispatchEvent(new Event("mirabit_auth_update"));
    navigate(redirectPath); // Redirects to the specifically requested page!
    onClose();
  };

  const goBack = () => {
    setStep("menu");
    setError("");
    setPin("");
    setUsername("");
    setRecoveryPhrase("");
  };

  const instantClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) instantClose();
      }}
    >
      <DialogContent
        className="w-[90vw] max-w-[400px] rounded-[2rem] p-0 gap-0 overflow-hidden bg-background border-2 [&>button]:hidden"
        onInteractOutside={(e) => {
          e.preventDefault();
          instantClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          instantClose();
        }}
      >
        <div className="p-6 md:p-8">
          {/* STEP 1: The Main Menu */}
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
                  className="w-full h-12 text-base font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95"
                >
                  Create wallet <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("restore")}
                  className="w-full h-12 text-base font-semibold rounded-2xl border-2 hover:bg-muted transition-transform active:scale-95"
                >
                  I already have a wallet
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Create Secure Wallet */}
          {step === "create" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
              <div className="flex justify-center mb-4">
                <Logo showWordmark={false} />
              </div>
              <h2 className="text-2xl font-bold text-center">
                Create Secure Wallet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground text-center mb-6">
                Your wallet identity will be securely created for you.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-muted-foreground">
                    Username (optional)
                  </Label>
                  <Input
                    id="username"
                    placeholder="e.g. Satoshi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl px-4"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pin" className="text-muted-foreground">
                    Create PIN (4 digits)
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    className="h-12 rounded-xl text-2xl tracking-widest text-center"
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
                    className="w-full h-12 text-base font-bold rounded-xl"
                  >
                    Generate Wallet
                  </Button>
                  <button
                    onClick={goBack}
                    className="w-full text-sm font-medium flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground py-2 transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Success & Bonus Screen */}
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

              <div className="w-full pt-8">
                <Button
                  onClick={handleAcceptBonus}
                  className="w-full h-14 text-base font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/25 transition-all active:scale-95"
                >
                  Claim Bonus & Enter App
                </Button>
              </div>
            </div>
          )}

          {/* RESTORE EXISTING WALLET */}
          {step === "restore" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
              <div className="flex justify-center mb-4 text-orange-500">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-center">Restore Wallet</h2>
              <p className="mt-2 text-sm text-muted-foreground text-center mb-6">
                Enter your recovery phrase to restore your funds.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phrase" className="sr-only">
                    Recovery Phrase
                  </Label>
                  <textarea
                    id="phrase"
                    placeholder="apple banana cherry..."
                    value={recoveryPhrase}
                    onChange={(e) => {
                      setRecoveryPhrase(e.target.value);
                      setError("");
                    }}
                    className="flex w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive font-medium text-center">
                    {error}
                  </p>
                )}

                <div className="pt-2 space-y-2">
                  <Button
                    onClick={handleRestoreWallet}
                    className="w-full h-12 text-base font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"
                  >
                    Restore wallet
                  </Button>
                  <button
                    onClick={goBack}
                    className="w-full text-sm font-medium flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground py-2 transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
