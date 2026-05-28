import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  PiggyBank,
  ArrowLeftRight,
  QrCode,
  GraduationCap,
  WifiOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Bitcoin,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    Icon: PiggyBank,
    title: "Bitcoin savings",
    description:
      "Save spare Naira or USDT — we convert it into Bitcoin so your money holds value over time.",
    tone: "from-orange-500 to-rose-500",
  },
  {
    Icon: QrCode,
    title: "QR payments",
    description:
      "Pay for textbooks, lunch or services with a quick scan. Send Bitcoin in seconds.",
    tone: "from-emerald-500 to-teal-500",
  },
  {
    Icon: ArrowLeftRight,
    title: "Easy conversions",
    description: "Swap between BTC, Naira and USDT at live rates with one tap.",
    tone: "from-blue-500 to-violet-500",
  },
  {
    Icon: WifiOff,
    title: "Works offline",
    description:
      "Queue payments and savings without internet. They sync the moment you reconnect.",
    tone: "from-amber-500 to-yellow-500",
  },
  {
    Icon: GraduationCap,
    title: "Learn & earn sats",
    description:
      "Beginner-friendly lessons teach Bitcoin basics. Pass each quiz to earn real sats.",
    tone: "from-fuchsia-500 to-pink-500",
  },
  {
    Icon: ShieldCheck,
    title: "Private by default",
    description:
      "No paperwork, no central database. Your data lives on your device.",
    tone: "from-cyan-500 to-sky-500",
  },
];

const TESTIMONIALS = [
  {
    name: "Chinaza",
    role: "200-level Engineering",
    quote:
      "I save ₦500 from my allowance every week. Watching my BTC pot grow keeps me motivated.",
    emoji: "👩🏾‍🎓",
  },
  {
    name: "Adewale",
    role: "Final year Econ",
    quote:
      "The learn mode finally made Bitcoin click for me. And I earned sats while reading!",
    emoji: "👨🏾‍🎓",
  },
  {
    name: "Tomi",
    role: "100-level CS",
    quote:
      "School wifi is a nightmare. MiraBit just queues my payments until I get signal back.",
    emoji: "🧑🏽‍💻",
  },
];

export default function Landing() {
  const location = useLocation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Resets the animation to hidden whenever the route changes
    setIsMounted(false);
    // Triggers the animation after a tiny 50ms delay
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useSeoMeta({
    title: "MiraBit — Bitcoin savings & payments for students",
    description:
      "Save with Naira or USDT, convert to Bitcoin, pay with QR codes, and learn the basics — built for students, works offline.",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/app/learn">Learn</Link>
            </Button>
            <Button asChild>
              <Link to="/app">
                Open app <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-aurora pt-24 pb-20 md:pt-28 md:pb-24">
        <div className="container max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* LEFT SIDE (Text Content) */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Bitcoin made simple
              </div>
              <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Save smarter.
                <br />
                Pay anywhere.
                <br />
                <span className="text-primary">Own your money.</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                MiraBit is the student-first fintech app that turns Naira or
                USDT savings into Bitcoin, lets you pay with QR codes, and
                teaches you the basics — even on the worst campus wifi.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 text-base px-6">
                  <Link to="/app">
                    Start saving <ArrowRight className="h-5 w-5 ml-1.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 text-base px-6"
                >
                  <Link to="/app/learn">Explore lessons</Link>
                </Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["Free to start", "Works offline", "Learn & earn sats"].map(
                  (b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" /> {b}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* RIGHT SIDE (Phone-style mock card) */}
            <div className="relative mx-auto w-full max-w-sm lg:-mt-10 animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-[1200ms] delay-[400ms] fill-mode-both ease-out">
              <div
                className="absolute -inset-8 -z-10 rounded-[3rem] opacity-40 blur-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(28 96% 54%), hsl(160 84% 39%))",
                }}
              />
              <div className="rounded-[2rem] border bg-card shadow-2xl overflow-hidden">
                <div
                  className="p-6 text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(28 96% 54%) 0%, hsl(18 92% 48%) 60%, hsl(340 80% 50%) 100%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium opacity-80">
                      Total balance
                    </span>
                    <Bitcoin className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-3xl font-extrabold tabular-nums">
                    ₦241,830<span className="text-base opacity-70">.50</span>
                  </div>
                  <div className="mt-1 text-xs opacity-80">
                    0.00428 ₿ · $148.20 USDT
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] font-medium">
                    {[
                      { I: PiggyBank, l: "Save" },
                      { I: ArrowLeftRight, l: "Swap" },
                      { I: QrCode, l: "Pay" },
                      { I: GraduationCap, l: "Learn" },
                    ].map(({ I, l }) => (
                      <div
                        key={l}
                        className="bg-white/15 backdrop-blur rounded-xl py-2 flex flex-col items-center gap-1 hover:bg-white/25 transition-colors cursor-pointer"
                      >
                        <I className="h-4 w-4" />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    {
                      i: PiggyBank,
                      t: "Saved to BTC",
                      a: "+0.00012 ₿",
                      c: "text-primary",
                    },
                    {
                      i: QrCode,
                      t: "Bookstore",
                      a: "-0.00008 ₿",
                      c: "text-rose-600",
                    },
                    {
                      i: Sparkles,
                      t: "Lesson reward",
                      a: "+0.00003 ₿",
                      c: "text-emerald-600",
                    },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <row.i className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-sm font-medium">{row.t}</div>
                      <div
                        className={`text-sm font-bold tabular-nums ${row.c}`}
                      >
                        {row.a}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="border-y bg-muted/30">
        <div className="container max-w-5xl py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                The problem
              </p>
              <h2 className="mt-2 text-2xl md:text-4xl font-bold tracking-tight">
                Students are locked out of digital finance.
              </h2>
            </div>

            <ul className="space-y-3 text-base flex flex-col items-end overflow-hidden">
              {[
                "Saving consistently feels impossible on a student budget",
                "Online payments fail or stall on patchy campus internet",
                "Crypto looks intimidating without beginner-friendly guidance",
                "Naira keeps losing value while options to hedge feel out of reach",
              ].map((text, i) => (
                <li
                  key={text}
                  className={`flex gap-3 items-start rounded-xl border bg-card p-4 hover:border-rose-500/30 hover:shadow-sm transition-all duration-700 ease-out
                    ${
                      isMounted
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 translate-x-12"
                    }
                  `}
                  style={{
                    transitionDelay: `${i * 300}ms`,
                    width: `${100 - i * 8}%`,
                  }}
                >
                  <span className="text-rose-500 mt-0.5 shrink-0">✕</span>
                  <span className="text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      {/* Features */}
      {/* Features */}
      {/* Features */}
      <section className="container max-w-6xl py-20 md:py-28">
        {/* Header Content */}
        <div
          className={`text-center max-w-2xl mx-auto transition-all duration-1000 ease-out ${
            isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            The solution
          </p>
          <h2 className="mt-2 text-3xl md:text-5xl font-bold tracking-tight">
            Everything you need, in one app.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built around how students actually live: small amounts, fast taps,
            spotty internet, and a real curiosity to learn.
          </p>
        </div>

        {/* The Features Grid */}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ Icon, title, description, tone }, i) => (
            <div
              key={title}
              // CHANGED: duration-500 is now duration-200 for a super snappy jump
              className={`group rounded-2xl border bg-card p-6 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 hover:scale-105 hover:border-orange-500/40 transition-all duration-200 ease-out z-10 hover:z-20
                ${
                  isMounted
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-12 scale-95"
                }
              `}
              style={{
                transitionDelay: isMounted ? `${i * 150}ms` : "0ms",
              }}
            >
              <div
                // CHANGED: Icon duration is also duration-200 to match the card speed
                className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md transition-all duration-200 group-hover:scale-125 group-hover:-rotate-6`}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold transition-colors duration-200 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                {title}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      {/* How it works */}
      <section className="bg-muted/30 border-y">
        <div className="container max-w-5xl py-20 md:py-24">
          {/* Header Content */}
          <div
            className={`text-center transition-all duration-1000 ease-out ${
              isMounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How MiraBit works
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Three simple steps to start owning Bitcoin today.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                title: "Top up",
                desc: "Add Naira or USDT to your MiraBit wallet from any source.",
              },
              {
                n: "02",
                title: "Save or pay",
                desc: "Convert spare funds into Bitcoin, or pay anyone with a QR scan.",
              },
              {
                n: "03",
                title: "Grow & learn",
                desc: "Watch your BTC stack build up while you complete fun lessons.",
              },
            ].map((s, i) => (
              <div
                key={s.n}
                // CHANGED: duration-500 is now duration-200 for a snappy hover jump
                className={`group rounded-2xl border bg-card p-6 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 hover:border-orange-500/40 transition-all duration-200 ease-out z-10 hover:z-20
                  ${
                    isMounted
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-12 scale-95"
                  }
                `}
                style={{
                  transitionDelay: isMounted ? `${i * 200}ms` : "0ms",
                }}
              >
                {/* CHANGED: duration-300 is now duration-200 so the number syncs with the card speed */}
                <div className="text-5xl font-extrabold text-primary/30 transition-all duration-200 group-hover:text-primary/60 group-hover:-translate-y-1">
                  {s.n}
                </div>
                <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Testimonials */}
      {/* Testimonials */}
      {/* Testimonials */}
      <section className="py-20 md:py-28 overflow-hidden">
        <div className="container max-w-6xl">
          {/* Header Content */}
          <div
            className={`text-center transition-all duration-1000 ease-out ${
              isMounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Built for the campus crowd
            </h2>
            <p className="mt-3 text-muted-foreground">
              What early users are saying.
            </p>
          </div>
        </div>

        {/* The Infinite Sliding Marquee */}
        <div className="relative mt-12 w-full flex items-center">
          {/* Custom CSS for the infinite scroll */}
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-50% - 12px)); }
            }
            .animate-marquee {
              animation: marquee 20s linear infinite;
            }
          `}</style>

          {/* Faded edges to make them magically appear and disappear */}
          <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* The scrolling track - pauses on hover! */}
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-6 px-6">
            {/* We duplicate the testimonials multiple times to create a seamless infinite loop */}
            {[
              ...TESTIMONIALS,
              ...TESTIMONIALS,
              ...TESTIMONIALS,
              ...TESTIMONIALS,
            ].map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                // Fixed width so they slide cleanly, kept the snappy hover effects!
                className="w-[300px] md:w-[350px] shrink-0 group rounded-2xl border bg-card p-6 flex flex-col hover:shadow-2xl hover:-translate-y-2 hover:scale-105 hover:border-orange-500/40 transition-all duration-200 ease-out cursor-pointer z-0 hover:z-20"
              >
                <p className="text-base leading-relaxed flex-1 transition-colors duration-200 group-hover:text-foreground">
                  "{t.quote}"
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl transition-all duration-200 group-hover:scale-125 group-hover:rotate-12 group-hover:bg-orange-500/10">
                    {t.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container max-w-5xl pb-24">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center text-black">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(135deg, hsl(28 96% 54%) 0%, hsl(18 92% 48%) 50%, hsl(340 80% 50%) 100%)",
            }}
          />
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Ready to start saving in Bitcoin?
          </h2>
          <p className="mt-4 text-black/90 max-w-xl mx-auto">
            Open the app — no signup, no waiting. Explore the entire MiraBit
            experience in seconds.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-7 h-12 text-base px-7 bg-white text-orange-600 hover:bg-white/95"
          >
            <Link to="/app">
              Launch MiraBit <ArrowRight className="h-5 w-5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="container max-w-6xl py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Logo />
          <div className="flex items-center gap-5 text-muted-foreground">
            <Link to="/app" className="hover:text-foreground">
              App
            </Link>
            <Link to="/app/learn" className="hover:text-foreground">
              Learn
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
