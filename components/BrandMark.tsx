import Link from "next/link";

export function LogoIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-run text-white ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        <path
          d="M3 12h4l2-5 3 10 2-5h7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-text hover:text-accent" aria-label="API HealthGuard">
      <LogoIcon />
      {compact ? null : <span className="text-sm font-semibold tracking-tight">API HealthGuard</span>}
    </Link>
  );
}
