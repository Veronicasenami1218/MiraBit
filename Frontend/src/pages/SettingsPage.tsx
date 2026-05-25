import { useSeoMeta } from "@unhead/react";
import {
  Moon,
  Sun,
  WifiOff,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/useToast";

const STORAGE_KEYS = [
  "mirabit:wallet:v1",
  "mirabit:transactions:v1",
  "mirabit:goals:v1",
  "mirabit:learn:v1",
  "mirabit:rates:v1",
];

export default function SettingsPage() {
  useSeoMeta({
    title: "Settings — MiraBit",
    description: "Customize MiraBit — theme, offline mode, and account data.",
  });

  const { theme, setTheme } = useTheme();
  const { simulatedOffline, setSimulatedOffline } = useOnlineStatus();
  const { toast } = useToast();

  const resetEverything = () => {
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    toast({
      title: "Data cleared",
      description: "Reloading with a fresh wallet.",
    });
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Personalise your MiraBit experience.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            icon={theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            title="Dark mode"
            description="Easier on the eyes at night."
            control={
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connectivity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            icon={<WifiOff className="h-4 w-4" />}
            title="Simulate offline mode"
            description="Test how MiraBit queues payments without an internet connection."
            control={
              <Switch
                checked={simulatedOffline}
                onCheckedChange={setSimulatedOffline}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account & data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
            title="Privacy"
            description="MiraBit stores everything locally on this device. Nothing is sent to a central server."
            control={null}
          />
          <SettingRow
            icon={<Trash2 className="h-4 w-4 text-rose-500" />}
            title="Reset wallet"
            description="Clear simulated balance, transaction history and learning progress."
            control={
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Reset</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear your wallet balance, transaction history,
                      savings goals and learning progress. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetEverything}>
                      Yes, reset everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" /> About MiraBit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            MiraBit is a student-focused fintech demo that makes Bitcoin
            savings, payments and financial education simple and accessible —
            even on patchy connections.
          </p>
          <p>
            This MVP simulates all balances and transactions on your device.
            Connect it to a real wallet (e.g. via Lightning / NWC) to make it
            production-ready.
          </p>
          <a
            href="https://shakespeare.diy"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
          >
            Vibed with Shakespeare <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}
