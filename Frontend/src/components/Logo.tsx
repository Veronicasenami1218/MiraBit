import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/**
 * MiraBit logo — a stylized "m" + Bitcoin spark.
 * Pure SVG so it's crisp at any size and theme-aware via currentColor.
 */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <svg
          viewBox="0 0 40 40"
          className="h-9 w-9"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mira-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(28 96% 58%)" />
              <stop offset="100%" stopColor="hsl(18 96% 50%)" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#mira-grad)" />
          {/* Stylized "m" */}
          <path
            d="M11 28V14h3l3.5 6 3.5-6h3v14h-3v-8l-3 5h-1l-3-5v8z"
            fill="white"
            opacity="0.95"
          />
          {/* Bitcoin spark */}
          <circle cx="30" cy="13" r="4" fill="white" />
          <text
            x="30"
            y="15.5"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="800"
            fill="hsl(28 96% 50%)"
            fontFamily="Inter, sans-serif"
          >
            ₿
          </text>
        </svg>
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="font-extrabold text-lg tracking-tight">
            Mira<span className="text-primary">Bit</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
            student finance
          </span>
        </div>
      )}
    </div>
  );
}
