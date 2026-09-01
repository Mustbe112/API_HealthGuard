"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { MethodBadge } from "@/components/MethodBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const { token } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="bg-accent/15 px-4 py-2 text-center text-sm text-accent">
        Zero-input testing is live — upload a spec, every endpoint is marked working or broken.
      </div>

      <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <PulseMark />
            API Vitals
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-text-muted md:flex">
            <a href="#product" className="hover:text-text">
              Product
            </a>
            <a href="#how" className="hover:text-text">
              How it works
            </a>
            <a href="#try" className="hover:text-text">
              Try endpoints
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {token ? (
              <Link
                href="/projects"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#0b1220] hover:bg-accent-hover"
              >
                Open projects
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-line bg-panel-raised px-4 py-2 text-sm text-text hover:border-accent/50"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#0b1220] hover:bg-accent-hover"
                >
                  Start for free
                  <Arrow />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        <Ribbon />

        <section className="relative mx-auto max-w-3xl px-6 pb-12 pt-16 text-center sm:pt-24">
          <Link
            href={token ? "/projects" : "/signup"}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-text-muted hover:border-accent/40 hover:text-text"
          >
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0b1220]">
              New
            </span>
            Zero-input testing — no IDs, tokens, or bodies
            <Arrow className="opacity-70" />
          </Link>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-text sm:text-6xl sm:leading-[1.08]">
            See what&apos;s broken in your API
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
            Upload an OpenAPI spec and run. Working means the status matches the spec — 404 and
            401 count when they should. Then send real data, like Postman, on any endpoint.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={token ? "/projects" : "/signup"}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-[#0b1220] hover:bg-accent-hover"
            >
              {token ? "Open projects" : "Start for free"}
              <Arrow />
            </Link>
            <a href="#how" className="px-4 py-2.5 text-sm text-text-muted hover:text-text">
              How it works
            </a>
          </div>
        </section>

        <section id="product" className="relative mx-auto max-w-5xl scroll-mt-24 px-6 pb-24">
          <ProductPreview />
        </section>

        <section id="how" className="scroll-mt-24 border-t border-line bg-panel/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-3">
            <Feature
              kicker="01"
              title="Upload a spec"
              body="OpenAPI or Postman. We parse every route, documented status, and whether auth is required."
            />
            <Feature
              kicker="02"
              title="Zero-input run"
              body="A throwaway account, random UUIDs, empty bodies. 5xx is broken. 404 on a missing id is working."
            />
            <Feature
              kicker="03"
              title="Try with real data"
              body="Open any endpoint like Postman: path params, headers, JSON body, bearer token, and the live response."
            />
          </div>
        </section>

        <section id="try" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <div className="rounded-2xl border border-line bg-panel px-8 py-12 text-center sm:px-16">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              From “is it up?” to “does create work?”
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-text-muted">
              Auto-tests catch crashes and missing routes. Manual try is for real payloads — the
              request you would send in Postman, without leaving the project.
            </p>
            <Link
              href={token ? "/projects" : "/signup"}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-[#0b1220] hover:bg-accent-hover"
            >
              {token ? "Go to your projects" : "Create an account"}
              <Arrow />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-text-muted">
          <span className="flex items-center gap-2 font-display text-sm text-text">
            <PulseMark />
            API Vitals
          </span>
          <span>Upload a spec. Run. See what&apos;s broken.</span>
        </div>
      </footer>
    </div>
  );
}

function PulseMark() {
  return (
    <span className="relative flex h-6 w-6 items-center justify-center rounded-md bg-panel-raised ring-1 ring-line">
      <span className="h-1.5 w-1.5 rounded-full bg-pass" />
    </span>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 ${className}`} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ribbon() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-[520px] overflow-hidden" aria-hidden>
      <svg className="h-full w-[140%] max-w-none -translate-x-[12%]" viewBox="0 0 1400 520" fill="none">
        <defs>
          <linearGradient id="ribbon" x1="0" y1="0" x2="1400" y2="200">
            <stop offset="0%" stopColor="#5b8def" stopOpacity="0.15" />
            <stop offset="45%" stopColor="#5b8def" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#34d399" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#5b8def" stopOpacity="0.2" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <path
          d="M-40 280 C 180 40, 380 480, 640 220 S 980 40, 1220 300 S 1480 420, 1520 180"
          stroke="url(#ribbon)"
          strokeWidth="72"
          strokeLinecap="round"
          filter="url(#soft)"
        />
        <path
          d="M-40 280 C 180 40, 380 480, 640 220 S 980 40, 1220 300 S 1480 420, 1520 180"
          stroke="url(#ribbon)"
          strokeWidth="36"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}

function Feature({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div>
      <div className="font-mono text-xs text-accent">{kicker}</div>
      <h3 className="mt-2 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_40px_80px_-40px_rgba(11,18,32,0.9)] ring-1 ring-white/5">
      <div className="flex items-center gap-2 border-b border-line bg-panel-raised px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-fail/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-pending/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-pass/80" />
        <div className="mx-auto flex h-8 w-full max-w-md items-center rounded-lg border border-line bg-ink px-3 text-xs text-text-muted">
          Lost & Found API
          <span className="ml-auto font-mono text-[10px]">Ctrl K</span>
        </div>
      </div>

      <div className="flex gap-6 border-b border-line px-5 pt-3 text-sm">
        {["Run results", "Try endpoints"].map((tab, i) => (
          <div
            key={tab}
            className={`pb-3 ${i === 0 ? "border-b-2 border-accent text-text" : "text-text-muted"}`}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Vital label="Working" value="34" tone="pass" />
        <Vital label="Broken" value="3" tone="fail" />
        <Vital label="Avg latency" value="108ms" tone="neutral" />
      </div>

      <div className="px-5 pb-5">
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-raised text-[11px] uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Sent</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              <PreviewRow method="GET" path="/health" sent="Nothing" status="200" outcome="working" />
              <PreviewRow method="GET" path="/items/{id}" sent="A random fake UUID" status="404" outcome="working" />
              <PreviewRow method="GET" path="/orders" sent="No token" status="401" outcome="manual" />
              <PreviewRow method="POST" path="/auth/register" sent="Throwaway account" status="500" outcome="broken" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  method,
  path,
  sent,
  status,
  outcome,
}: {
  method: "GET" | "POST";
  path: string;
  sent: string;
  status: string;
  outcome: "working" | "broken" | "manual";
}) {
  const tone = outcome === "working" ? "text-pass" : outcome === "broken" ? "text-fail" : "text-pending";
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <MethodBadge method={method} />
          <span className="font-mono text-xs">{path}</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 text-xs text-text-muted sm:table-cell">{sent}</td>
      <td className={`px-4 py-3 font-mono text-xs ${tone}`}>{status}</td>
      <td className="px-4 py-3">
        <StatusBadge outcome={outcome} />
      </td>
    </tr>
  );
}

function Vital({ label, value, tone }: { label: string; value: string; tone: "pass" | "fail" | "neutral" }) {
  const color = tone === "pass" ? "text-pass" : tone === "fail" ? "text-fail" : "text-text";
  return (
    <div className="rounded-xl border border-line bg-ink/40 p-4">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
