import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

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
          <rect
            x="2"
            y="2"
            width="36"
            height="36"
            rx="10"
            fill="hsl(18 96% 50%)"
          />
          {/* Stylized "m" */}
          <text
            x="15"
            y="27"
            textAnchor="middle"
            fontSize="18"
            fontWeight="600"
            fill="white"
            fontFamily="Inter, sans-serif"
          >
            M
          </text>

          <text
            x="29"
            y="26"
            textAnchor="middle"
            fontSize="19"
            fontWeight="800"
            fill="white"
            fontFamily="Arial, sans-serif"
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
            Save. Convert. Pay
          </span>
        </div>
      )}
    </div>
  );
}
