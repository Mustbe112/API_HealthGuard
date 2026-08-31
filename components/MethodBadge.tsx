import type { HttpMethod } from "@/lib/types";

const STYLES: Record<HttpMethod, string> = {
  GET: "text-text-muted border-line",
  HEAD: "text-text-muted border-line",
  OPTIONS: "text-text-muted border-line",
  POST: "text-accent border-accent/40",
  PUT: "text-accent border-accent/40",
  PATCH: "text-accent border-accent/40",
  DELETE: "text-fail border-fail/40",
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide ${STYLES[method]}`}
    >
      {method}
    </span>
  );
}
