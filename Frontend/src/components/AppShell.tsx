import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  PiggyBank,
  ArrowLeftRight,
  QrCode,
  GraduationCap,
  Menu,
  Sparkles,
} from "lucide-react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SimpleAuthDialog } from "@/components/auth/SimpleAuthDialog";

const NAV_ITEMS = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/savings", label: "Savings", icon: PiggyBank, exact: false },
  { to: "/app/convert", label: "Convert", icon: ArrowLeftRight, exact: false },
  { to: "/app/pay", label: "Pay", icon: QrCode, exact: false },
  { to: "/app/learn", label: "Learn", icon: GraduationCap, exact: false },
] as const;

export function AppShell() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(true);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SimpleAuthDialog isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <div
        className={authOpen ? "blur-sm pointer-events-none select-none" : ""}
      >
        <OfflineBanner />

        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
          <div className="container max-w-5xl flex items-center justify-between h-16">
            <Link
              to="/app"
              className="flex items-center"
              aria-label="MiraBit home"
            >
              <Logo />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/app/settings">Settings</Link>
              </Button>

              {/* Mobile menu */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      <Logo />
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        onClick={() => setSheetOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted",
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </NavLink>
                    ))}
                    <NavLink
                      to="/app/settings"
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted",
                        )
                      }
                    >
                      <Menu className="h-5 w-5" />
                      Settings
                    </NavLink>
                  </nav>
                  <div className="mt-8 pt-6 border-t text-xs text-muted-foreground space-y-2">
                    <p>
                      MiraBit is an educational student-finance demo. Balances
                      are simulated locally on your device.
                    </p>
                    <a
                      href="https://shakespeare.diy"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Sparkles className="h-3 w-3" /> Vibed with Shakespeare
                    </a>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-12">
          <div className="container max-w-5xl py-6 md:py-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Primary"
          className={cn(
            "md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-md",
            "pb-[env(safe-area-inset-bottom,0px)]",
          )}
        >
          <ul className="grid grid-cols-5">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-transform",
                        active && "scale-110",
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
