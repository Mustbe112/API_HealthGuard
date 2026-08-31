"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Endpoint, HttpMethod, ManualTryResult } from "@/lib/types";
import { Button } from "@/components/Button";
import { MethodBadge } from "@/components/MethodBadge";

const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH"]);

export function pathParamNames(path: string): string[] {
  const names: string[] = [];
  for (const m of path.matchAll(/\{([^}]+)\}/g)) names.push(m[1]);
  for (const m of path.matchAll(/\/:([^/?#]+)/g)) names.push(m[1]);
  return [...new Set(names)];
}

export function skeletonBody(schema: unknown): string {
  if (schema == null) return "{\n  \n}";
  if (typeof schema === "string") return schema;
  if (typeof schema !== "object") return "{\n  \n}";
  const s = schema as { type?: string; properties?: Record<string, { type?: string }> };
  if (s.properties && typeof s.properties === "object") {
    const obj: Record<string, unknown> = {};
    for (const [key, spec] of Object.entries(s.properties)) {
      const t = spec?.type;
      obj[key] = t === "number" || t === "integer" ? 0 : t === "boolean" ? false : t === "array" ? [] : t === "object" ? {} : "";
    }
    return JSON.stringify(obj, null, 2);
  }
  if (!("type" in s) && !("$ref" in s)) {
    return JSON.stringify(s, null, 2);
  }
  return "{\n  \n}";
}

function pretty(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type Pair = { key: string; value: string };

function pairsToRecord(pairs: Pair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of pairs) {
    if (p.key.trim()) out[p.key.trim()] = p.value;
  }
  return out;
}

interface Props {
  token: string;
  projectId: string;
  endpoints: Endpoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EndpointTester({ token, projectId, endpoints, selectedId, onSelect }: Props) {
  const selected = endpoints.find((e) => e.id === selectedId) ?? endpoints[0] ?? null;
  const paramNames = useMemo(() => (selected ? pathParamNames(selected.path) : []), [selected]);
  const needsBody = selected ? BODY_METHODS.has(selected.method) : false;

  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryPairs, setQueryPairs] = useState<Pair[]>([{ key: "", value: "" }]);
  const [headerPairs, setHeaderPairs] = useState<Pair[]>([{ key: "", value: "" }]);
  const [bearerToken, setBearerToken] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualTryResult | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!selected) return;
    const params: Record<string, string> = {};
    for (const name of pathParamNames(selected.path)) params[name] = "";
    setPathParams(params);

    const fromSpec = selected.headers
      ? Object.entries(selected.headers)
          .filter(([k]) => k.toLowerCase() !== "authorization")
          .map(([key, value]) => ({ key, value }))
      : [];
    setHeaderPairs(fromSpec.length > 0 ? [...fromSpec, { key: "", value: "" }] : [{ key: "", value: "" }]);
    setQueryPairs([{ key: "", value: "" }]);
    setBody(needsBody ? skeletonBody(selected.requestSchema) : "");
    setResult(null);
    setError(null);
  }, [selected?.id]);

  const visible = endpoints.filter((e) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return `${e.method} ${e.path} ${e.name}`.toLowerCase().includes(q);
  });

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const { result: next } = await api.tryEndpoint(token, projectId, selected.id, {
        pathParams,
        query: pairsToRecord(queryPairs),
        headers: pairsToRecord(headerPairs),
        body: needsBody ? body : undefined,
        bearerToken: bearerToken.trim() || undefined,
      });
      setResult(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
      setResult(null);
    } finally {
      setSending(false);
    }
  }

  if (endpoints.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-muted">
        Upload a spec to try endpoints with real data.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="border-b border-line p-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter endpoints"
            className="w-full rounded border border-line bg-panel-raised px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {visible.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-panel-raised ${
                selected?.id === e.id ? "bg-panel-raised" : ""
              }`}
            >
              <MethodBadge method={e.method} />
              <span className="truncate font-mono">{e.path}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-panel p-4">
            <div className="mb-4 flex items-center gap-2">
              <MethodBadge method={selected.method} />
              <span className="font-mono text-sm">{selected.path}</span>
            </div>
            {selected.name && (
              <p className="mb-4 text-xs text-text-muted">{selected.name}</p>
            )}

            {paramNames.length > 0 && (
              <FieldGroup label="Path params">
                {paramNames.map((name) => (
                  <label key={name} className="block">
                    <span className="mb-1 block font-mono text-[11px] text-text-muted">{name}</span>
                    <input
                      value={pathParams[name] ?? ""}
                      onChange={(e) => setPathParams((prev) => ({ ...prev, [name]: e.target.value }))}
                      placeholder="real id"
                      className="w-full rounded border border-line bg-panel-raised px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
                    />
                  </label>
                ))}
              </FieldGroup>
            )}

            <FieldGroup label="Query params">
              <PairList pairs={queryPairs} onChange={setQueryPairs} keyPlaceholder="limit" />
            </FieldGroup>

            <FieldGroup label="Authorization">
              <input
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Bearer token (optional)"
                className="w-full rounded border border-line bg-panel-raised px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
              />
            </FieldGroup>

            <FieldGroup label="Headers">
              <PairList pairs={headerPairs} onChange={setHeaderPairs} keyPlaceholder="X-Request-Id" />
            </FieldGroup>

            {needsBody && (
              <FieldGroup label="JSON body">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  className="w-full rounded border border-line bg-panel-raised px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-accent"
                />
              </FieldGroup>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={handleSend} disabled={sending}>
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-fail">{error}</p>}
          </div>

          {result && (
            <div className="rounded-xl border border-line bg-panel p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="text-xs uppercase tracking-wide text-text-muted">Response</div>
                <div className="font-mono text-xs text-text-muted">
                  <span className={result.statusCode && result.statusCode >= 500 ? "text-fail" : result.statusCode && result.statusCode < 400 ? "text-pass" : "text-pending"}>
                    {result.statusCode ?? "no response"}
                  </span>
                  {result.responseTimeMs != null && ` · ${result.responseTimeMs}ms`}
                </div>
              </div>
              <p className="mb-2 truncate font-mono text-[11px] text-text-muted">{result.request.url}</p>
              {result.errorMessage && <p className="mb-2 text-xs text-fail">{result.errorMessage}</p>}
              <pre className="max-h-96 overflow-auto rounded border border-line bg-panel-raised p-3 font-mono text-xs leading-relaxed text-text">
                {pretty(result.responseBody) || "(empty)"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</div>
      {children}
    </div>
  );
}

function PairList({
  pairs,
  onChange,
  keyPlaceholder,
}: {
  pairs: Pair[];
  onChange: (next: Pair[]) => void;
  keyPlaceholder: string;
}) {
  return (
    <div className="space-y-1.5">
      {pairs.map((p, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={p.key}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...p, key: e.target.value };
              onChange(next);
            }}
            placeholder={keyPlaceholder}
            className="w-1/3 rounded border border-line bg-panel-raised px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
          />
          <input
            value={p.value}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...p, value: e.target.value };
              if (i === pairs.length - 1 && (e.target.value || p.key)) next.push({ key: "", value: "" });
              onChange(next);
            }}
            placeholder="value"
            className="flex-1 rounded border border-line bg-panel-raised px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
          />
        </div>
      ))}
    </div>
  );
}
