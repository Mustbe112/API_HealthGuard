import { LogoIcon } from "@/components/BrandMark";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="relative">
        <span className="hg-pulse-ring absolute inset-0 rounded-md bg-accent/30" />
        <LogoIcon className="relative h-10 w-10" />
      </div>
      <p className="text-sm text-text-muted">Loading API Vitals…</p>
    </div>
  );
}
