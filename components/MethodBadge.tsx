import type { HttpMethod } from "@/lib/types";

const STYLES: Record<HttpMethod, string> = {
  GET: "text-get",
  HEAD: "text-text-muted",
  OPTIONS: "text-text-muted",
  POST: "text-post",
  PUT: "text-put",
  PATCH: "text-patch",
  DELETE: "text-delete",
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`inline-block w-14 shrink-0 text-[11px] font-semibold tracking-wide ${STYLES[method]}`}>
      {method}
    </span>
  );
}
