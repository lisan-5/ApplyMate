import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function ApplyMateLogo({ className, size = "md" }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn(sizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--gradient-start))" />
          <stop offset="55%" stopColor="hsl(var(--gradient-mid))" />
          <stop offset="100%" stopColor="hsl(var(--gradient-end))" />
        </linearGradient>
      </defs>
      {/* Abstract "A" — two converging lines forming an upward arrow/compass */}
      <path
        d="M20 4L6 36"
        stroke="url(#logoGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 4L34 36"
        stroke="url(#logoGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Crossbar */}
      <path
        d="M11 24H29"
        stroke="url(#logoGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Dot at apex */}
      <circle cx="20" cy="4" r="2.5" fill="url(#logoGrad)" />
    </svg>
  );
}

