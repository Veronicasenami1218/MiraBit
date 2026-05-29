import { useState } from "react";
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
} from "lucide-react";

interface SimpleAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleAuthDialog({ isOpen, onClose }: SimpleAuthDialogProps) {
  const [step, setStep] = useState<"menu" | "create" | "restore">("menu");

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
    onClose(); // This is the ONLY way the modal can now close!
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
    onClose(); // This is the ONLY way the modal can now close!
  };

  const goBack = () => {
    setStep("menu");
    setError("");
    setPin("");
    setUsername("");
    setRecoveryPhrase("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        // CHANGED: Added [&>button]:hidden to remove the default top-right 'X' button
        className="w-[90vw] max-w-[400px] rounded-[2rem] p-0 gap-0 overflow-hidden bg-background border-2 [&>button]:hidden"
        // CHANGED: Prevent closing when clicking outside or pressing the Escape key
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 md:p-8">
          {/* STEP 1: The Main Menu */}
          {step === "menu" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col items-center text-center">
              {/* CHANGED: Logo and Wallet are now side-by-side using flex-row */}
              <div className="py-8 w-full mb-6 bg-muted/30 rounded-2xl border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-rose-100 opacity-50 dark:opacity-5" />
                <div className="relative flex items-center justify-center gap-4">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <Logo showWordmark={false} />

                  {/* Small divider line */}
                  {/* <div className="h-8 w-[2px] bg-foreground/10 rounded-full" /> */}

                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Wallet className="h-8 w-8" />
                    <Sparkles className="h-3 w-3" />
                  </div>
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

          {/* STEP 3: Restore Existing Wallet */}
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
