import Link from "next/link";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-text hover:text-accent">
      <span className="flex h-7 w-7 items-center justify-center rounded bg-run text-[10px] font-semibold text-white">
        HG
      </span>
      {compact ? null : <span className="text-sm font-semibold tracking-tight">API HealthGuard</span>}
    </Link>
  );
}
