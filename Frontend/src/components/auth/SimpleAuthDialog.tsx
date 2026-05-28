import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react"; // Imported eye icons

interface SimpleAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleAuthDialog({ isOpen, onClose }: SimpleAuthDialogProps) {
  const [step, setStep] = useState<
    "welcome" | "signup" | "password" | "login" | "privacy"
  >("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  // Visibility states for the password inputs
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleNextToPassword = () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (!agreed) {
      setError("Please accept the privacy policy to continue.");
      return;
    }
    setError("");
    setStep("password");
  };

  const handleSignup = () => {
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    localStorage.setItem(
      "mirabit_user",
      JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password: password,
        signupBonus: 2000,
        isNew: true,
      }),
    );
    window.dispatchEvent(new Event("mirabit_auth_update"));
    onClose();
  };

  const handleLogin = () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    const stored = localStorage.getItem("mirabit_user");
    if (!stored) {
      setError("No account found. Please sign up first.");
      return;
    }
    const user = JSON.parse(stored);
    if (user.email !== email.trim() || user.password !== password) {
      setError("Invalid email or password.");
      return;
    }
    // Mark as not new on login
    localStorage.setItem(
      "mirabit_user",
      JSON.stringify({ ...user, isNew: false }),
    );
    window.dispatchEvent(new Event("mirabit_auth_update"));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-sm rounded-2xl p-0 gap-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div
          className="p-6 text-white text-center"
          style={{
            background:
              "linear-gradient(135deg, hsl(28 96% 54%) 0%, hsl(18 92% 48%) 100%)",
          }}
        >
          <div className="flex justify-center mb-3">
            <Logo showWordmark={false} />
          </div>
          <h2 className="text-xl font-extrabold">Welcome to MiraBit</h2>
          <p className="text-sm text-white/80 mt-1">Save. Convert. Pay.</p>
        </div>

        <div className="px-6 pb-6 pt-5 space-y-4">
          {/* Welcome step */}
          {step === "welcome" && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Your Bitcoin savings journey starts here.
              </p>
              <Button onClick={() => setStep("signup")} className="w-full h-12">
                Create account
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("login")}
                className="w-full h-12"
              >
                I already have an account
              </Button>
            </div>
          )}

          {/* Signup step */}
          {step === "signup" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Your name</Label>
                <Input
                  id="signup-name"
                  placeholder="e.g. Tunmise"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacy"
                  checked={agreed}
                  onCheckedChange={(v) => {
                    setAgreed(!!v);
                    setError("");
                  }}
                  className="mt-0.5"
                />
                <label
                  htmlFor="privacy"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setStep("privacy")}
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    Privacy Policy
                  </button>
                  . MiraBit stores your data locally on your device only.
                </label>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={handleNextToPassword} className="w-full h-12">
                Continue
              </Button>
              <button
                onClick={() => {
                  setStep("welcome");
                  setError("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </div>
          )}

          {/* Create Password step */}
          {step === "password" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Create password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm-password">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={handleSignup} className="w-full h-12">
                Get started
              </Button>
              <button
                onClick={() => {
                  setStep("signup");
                  setError("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </div>
          )}

          {/* Privacy Policy step */}
          {step === "privacy" && (
            <div className="space-y-4">
              <div className="h-64 overflow-y-auto rounded-xl border p-4 text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p className="font-semibold text-foreground text-sm">
                  MiraBit Privacy Policy
                </p>

                <p>
                  MiraBit is committed to protecting your privacy. This Privacy
                  Policy explains how we handle information within the MiraBit
                  application. Because we believe in financial privacy and
                  decentralization, our application is designed to minimize data
                  collection.
                </p>
                <p className="font-medium text-foreground">
                  1. Information We Collect and How It Is Used
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Local User Profile:
                  </span>{" "}
                  If you choose to provide a name or email address within the
                  app to personalize your profile, this data is stored strictly
                  locally on your device. We do not transmit, store, or process
                  this personal data on any external servers.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Bitcoin & Wallet Data:
                  </span>{" "}
                  All wallet-related data, including private keys, public
                  addresses, transaction histories, and balances, is generated
                  and stored locally on your device. MiraBit has no access to
                  your wallet, your funds, or your transaction history.
                </p>
                <p className="font-medium text-foreground">
                  2. Third-Party Services and Tracking
                </p>
                <p>
                  We do not use tracking cookies, analytics software, or
                  third-party SDKs that monitor your usage habits. We do not
                  sell, trade, or rent your personal information to third
                  parties.
                </p>
                <p className="font-medium text-foreground">3. Data Security</p>
                <p>
                  Because your data is stored locally on your device, the
                  security of your information depends on your device's
                  security. We highly recommend securing your device with
                  biometrics, strong passwords, and backing up your wallet
                  recovery phrases securely.
                </p>

                <p className="font-medium text-foreground">4. Contact Us</p>
                <p>
                  If you have any questions or concerns about this Privacy
                  Policy or how your data is handled, please contact us at:
                  privacy@mirabit.app
                </p>
              </div>
              <Button
                onClick={() => {
                  setAgreed(true);
                  setStep("signup");
                }}
                className="w-full h-12"
              >
                I accept
              </Button>
              <button
                onClick={() => setStep("signup")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </div>
          )}

          {/* Login step */}
          {step === "login" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Welcome back! Enter your email to continue.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleLogin} className="w-full h-12">
                Log in
              </Button>
              <button
                onClick={() => {
                  setStep("welcome");
                  setError("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
