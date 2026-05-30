import { useSeoMeta } from "@unhead/react";
import { Link, useSearchParams } from "react-router-dom";
import { useInView } from "@/hooks/useInView";
import { useEffect, useState } from "react";
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
import { SimpleAuthDialog } from "@/components/auth/SimpleAuthDialog";

const FEATURES = [
  {
    Icon: PiggyBank,
    title: "Bitcoin savings",
    description:
      "Save spare Naira or USDT — we convert it into Bitcoin so your money holds value over time.",
    tone: "from-orange-500 to-rose-500",
    hoverText: "group-hover:text-orange-600 dark:group-hover:text-orange-400",
    hoverBorder: "hover:border-orange-500/40",
    hoverShadow: "hover:shadow-orange-500/10",
  },
  {
    Icon: QrCode,
    title: "QR payments",
    description:
      "Pay for textbooks, lunch or services with a quick scan. Send Bitcoin in seconds.",
    tone: "from-emerald-500 to-teal-500",
    hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/40",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
  {
    Icon: ArrowLeftRight,
    title: "Easy conversions",
    description: "Swap between BTC, Naira and USDT at live rates with one tap.",
    tone: "from-blue-500 to-violet-500",
    hoverText: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    hoverBorder: "hover:border-blue-500/40",
    hoverShadow: "hover:shadow-blue-500/10",
  },
  {
    Icon: WifiOff,
    title: "Works offline",
    description:
      "Queue payments and savings without internet. They sync the moment you reconnect.",
    tone: "from-amber-500 to-yellow-500",
    hoverText: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    hoverBorder: "hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-500/10",
  },
  {
    Icon: GraduationCap,
    title: "Learn & earn sats",
    description:
      "Beginner-friendly lessons teach Bitcoin basics. Pass each quiz to earn real sats.",
    tone: "from-fuchsia-500 to-pink-500",
    hoverText: "group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400",
    hoverBorder: "hover:border-fuchsia-500/40",
    hoverShadow: "hover:shadow-fuchsia-500/10",
  },
  {
    Icon: ShieldCheck,
    title: "Private by default",
    description:
      "No paperwork, no central database. Your data lives on your device.",
    tone: "from-cyan-500 to-sky-500",
    hoverText: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    hoverBorder: "hover:border-cyan-500/40",
    hoverShadow: "hover:shadow-cyan-500/10",
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

function CountUp({
  target,
  prefix = "",
  duration = 2000,
  start = false,
}: {
  target: number;
  prefix?: string;
  duration?: number;
  start?: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) {
      setCount(0);
      return;
    }
    let startTime: number | null = null;
    let raf: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);

  return (
    <>
      {prefix}
      {count.toLocaleString()}
    </>
  );
}

function StepCountUp({
  target,
  duration = 800,
  start = false,
  delay = 0,
}: {
  target: number;
  duration?: number;
  start?: boolean;
  delay?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) {
      setCount(0);
      return;
    }
    const timeout = setTimeout(() => {
      let startTime: number | null = null;
      let raf: number;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, delay);
    return () => clearTimeout(timeout);
  }, [start, target, duration, delay]);

  return <>{String(count).padStart(2, "0")}</>;
}

export default function Landing() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState("/app");
  const [scrolled, setScrolled] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const handleOpenAuth = (path = "/app") => {
    setAuthRedirectTo(path);
    setIsAuthOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("login") === "true") {
      handleOpenAuth("/app");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroCard = useInView();
  const problems = useInView();
  const features = useInView();
  const howItWorks = useInView();
  const testimonials = useInView();
  const cta = useInView();

  useSeoMeta({
    title: "MiraBit — Bitcoin savings & payments for students",
    description:
      "Save with Naira or USDT, convert to Bitcoin, pay with QR codes, and learn the basics — built for students, works offline.",
  });

  return (
    <div
      className={`min-h-screen bg-background text-foreground transition-[filter] duration-500 ${isAuthOpen ? "blur-md brightness-75" : ""}`}
    >
      {/* Header */}
      <header
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b shadow-sm"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className={`hidden sm:inline-flex transition-colors duration-300 ${
                !scrolled
                  ? "text-white hover:text-white hover:bg-orange-600"
                  : ""
              }`}
              onClick={() => handleOpenAuth("/app/learn")}
            >
              Learn
            </Button>
            <Button
              className={
                !scrolled
                  ? "bg-white text-orange-600 hover:bg-white/90 border-0"
                  : ""
              }
              onClick={() => handleOpenAuth("/app")}
            >
              Open app <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-aurora pt-24 pb-20 md:pt-28 md:pb-24">
        <div className="container max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* LEFT SIDE */}
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-[800ms] fill-mode-both ease-out">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Bitcoin made simple
              </div>
              <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Save. Convert.
                <br />
                Pay. Learn.
                <br />
                <span className="text-primary">Own your money.</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                MiraBit is the student-first fintech app that turns Naira or
                USDT savings into Bitcoin, lets you pay with QR codes, and
                teaches you the basics — even on the worst campus wifi.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 text-base px-6"
                  onClick={() => handleOpenAuth("/app")}
                >
                  Start saving <ArrowRight className="h-5 w-5 ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-base px-6"
                  onClick={() => handleOpenAuth("/app/learn")}
                >
                  Explore lessons
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
            <div
              ref={heroCard.ref}
              className="relative mx-auto w-full max-w-sm lg:-mt-10 animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-[1200ms] delay-[400ms] fill-mode-both ease-out"
            >
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
                    <CountUp
                      target={500000}
                      prefix="₦"
                      duration={2000}
                      start={heroCard.inView}
                    />
                    <span className="text-base opacity-70">.50</span>
                  </div>
                  <div className="mt-1 text-xs opacity-80">
                    0.00428 ₿ · $148.20 USDT
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] font-medium">
                    {[
                      { I: PiggyBank, l: "Save" },
                      { I: ArrowLeftRight, l: "Convert" },
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

      {/* Problem Statement */}
      <section className="border-y bg-muted/30">
        <div className="container max-w-5xl py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="mt-2 text-2xl md:text-4xl font-bold tracking-tight">
                Students are locked out of digital finance.
              </h2>
            </div>
            <div ref={problems.ref}>
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
                      ${problems.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}
                    `}
                    style={{
                      transitionDelay: `${i * 150}ms`,
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
        </div>
      </section>

      {/* Features / Solution Cards */}
      <section className="container max-w-6xl py-20 md:py-28">
        <div
          ref={features.ref}
          className={`text-center max-w-2xl mx-auto transition-all duration-1000 ease-out ${
            features.inView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="mt-2 text-3xl md:text-5xl font-bold tracking-tight">
            Everything you need, in one app.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built around how students actually live: small amounts, fast taps,
            spotty internet, and a real curiosity to learn.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(
            (
              {
                Icon,
                title,
                description,
                tone,
                hoverText,
                hoverBorder,
                hoverShadow,
              },
              i,
            ) => (
              <div
                key={title}
                className={`group rounded-2xl border bg-card p-6 hover:shadow-2xl ${hoverShadow} hover:-translate-y-2 hover:scale-105 ${hoverBorder} transition-all duration-700 ease-out z-10 hover:z-20
  ${features.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}
`}
                style={{
                  transitionDelay: features.inView ? `${i * 300}ms` : "0ms",
                }}
              >
                <div
                  className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md transition-all duration-200 group-hover:scale-125 group-hover:-rotate-6`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3
                  className={`mt-5 text-lg font-semibold transition-colors duration-200 ${hoverText}`}
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y">
        <div className="container max-w-5xl py-20 md:py-24">
          <div
            ref={howItWorks.ref}
            className={`text-center transition-all duration-1000 ease-out ${
              howItWorks.inView
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
                n: 1,
                title: "Top up",
                desc: "Add Naira or USDT to your MiraBit wallet from any source.",
                enterClass: "md:-translate-x-12 translate-y-8",
              },
              {
                n: 2,
                title: "Save or pay",
                desc: "Convert spare funds into Bitcoin, or pay anyone with a QR scan.",
                enterClass: "translate-y-12",
              },
              {
                n: 3,
                title: "Grow & learn",
                desc: "Watch your BTC stack build up while you complete fun lessons.",
                enterClass: "md:translate-x-12 translate-y-8",
              },
            ].map((s, i) => (
              <div
                key={s.n}
                style={{
                  transitionDelay: howItWorks.inView ? `${i * 200}ms` : "0ms",
                  isolation: "isolate",
                }}
                className={`group relative rounded-2xl border bg-card p-6
                  hover:shadow-2xl hover:-translate-y-2 hover:scale-105 hover:border-orange-500/40
                  transition-[transform,box-shadow,border-color,opacity] duration-500 ease-out
                  overflow-hidden
                  ${
                    howItWorks.inView
                      ? "opacity-100 translate-x-0 translate-y-0"
                      : `opacity-0 ${s.enterClass}`
                  }
                `}
              >
                <div className="absolute left-0 top-0 w-[3px] bg-primary rounded-l-2xl h-0 group-hover:h-full transition-[height] duration-300 ease-out" />
                <div
                  className="text-5xl font-extrabold tabular-nums
                    text-primary/30 group-hover:text-primary
                    transition-[color,transform] duration-200
                    group-hover:-translate-y-3"
                >
                  <StepCountUp
                    target={s.n}
                    duration={600}
                    start={howItWorks.inView}
                    delay={i * 200}
                  />
                </div>
                <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 overflow-hidden">
        <div className="container max-w-6xl">
          <div
            ref={testimonials.ref}
            className={`text-center transition-all duration-1000 ease-out ${
              testimonials.inView
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

        <div className="relative mt-12 w-full flex items-center">
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-50% - 12px)); }
            }
            .animate-marquee {
              animation: marquee 80s linear infinite;
            }
          `}</style>
          <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-6 px-6">
            {[
              ...TESTIMONIALS,
              ...TESTIMONIALS,
              ...TESTIMONIALS,
              ...TESTIMONIALS,
            ].map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                style={{ isolation: "isolate" }}
                className="w-[300px] md:w-[350px] shrink-0 group rounded-2xl border bg-card p-6 flex flex-col hover:shadow-2xl hover:-translate-y-2 hover:scale-105 hover:border-orange-500/40 transition-all duration-200 ease-out cursor-pointer"
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
        <div
          ref={cta.ref}
          className={`mx-auto max-w-4xl rounded-[2rem] overflow-hidden border bg-card shadow-2xl transition-all duration-700 ease-out hover:shadow-orange-500/20 hover:-translate-y-2
            ${cta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
          `}
          style={{ transitionDelay: cta.inView ? "300ms" : "0ms" }}
        >
          <div
            className="px-6 py-12 md:p-16 text-center text-white relative"
            style={{
              background:
                "linear-gradient(135deg, hsl(28 96% 54%) 0%, hsl(18 92% 48%) 60%, hsl(340 80% 50%) 100%)",
            }}
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm text-orange-600">
                <Sparkles className="h-3.5 w-3.5" /> Takes under 60 seconds
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Take control of your money.
              </h2>
              <p className="mt-5 text-white/90 max-w-xl mx-auto text-lg leading-relaxed font-medium">
                Stop watching your savings lose value. Create your free account
                today to start stacking Bitcoin, paying instantly on campus, and
                earning rewards.
              </p>
            </div>
          </div>

          <div className="bg-card p-8 md:p-10 flex flex-col items-center justify-center border-t border-orange-500/10">
            <Button
              size="lg"
              onClick={() => handleOpenAuth("/app")}
              className="group/btn h-14 text-base px-10 font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-lg hover:shadow-orange-500/25 transition-all duration-200 hover:scale-105 border-0"
            >
              Create free account
              <ArrowRight className="h-5 w-5 ml-2 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
            </Button>
            <p className="mt-4 text-xs text-muted-foreground font-medium">
              Join thousands of students already saving.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t bg-card overflow-hidden mt-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-orange-500/10 via-background to-background" />

        <div className="container max-w-6xl py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
            <div className="col-span-2 flex flex-col items-start">
              <Logo />
              <p className="mt-5 text-sm text-muted-foreground max-w-sm leading-relaxed">
                The student-first fintech app. Save in Bitcoin, pay with QR
                codes, and learn the basics of digital finance without the
                confusion.
              </p>
              <p className="mt-4 text-xs font-bold tracking-widest uppercase text-orange-500">
                Save. Convert. Pay. Learn.
              </p>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-5 text-foreground">
                Product
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <button
                    onClick={() => handleOpenAuth("/app")}
                    className="hover:text-orange-500 transition-colors"
                  >
                    Launch App
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleOpenAuth("/app/learn")}
                    className="hover:text-orange-500 transition-colors"
                  >
                    Learn & Earn
                  </button>
                </li>
                <li>
                  <Link
                    to="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Fees & Limits
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-5 text-foreground">
                Connect
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Twitter / X
                  </Link>
                </li>
                <li>
                  <Link
                    to="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Instagram
                  </Link>
                </li>
                <li>
                  <Link
                    to="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Campus Reps
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} MiraBit. Built for the campus crowd.
            </p>
            <div className="flex gap-5">
              <Link to="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <SimpleAuthDialog
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        redirectPath={authRedirectTo}
      />
    </div>
  );
}
