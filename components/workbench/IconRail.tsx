"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { to: "", label: "Dashboard", icon: DashIcon, end: true },
  { to: "/endpoints", label: "Endpoints", icon: ListIcon, end: false },
  { to: "/map", label: "API map", icon: MapIcon, end: false },
  { to: "/history", label: "History", icon: ClockIcon, end: false },
  { to: "/incidents", label: "Incidents", icon: AlertIcon, end: false },
  { to: "/settings", label: "Settings", icon: GearIcon, end: false },
];

export function IconRail({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex h-full w-12 shrink-0 flex-col items-center bg-rail py-3">
      <Link
        href={base}
        title="API HealthGuard"
        className="mb-6 flex h-7 w-7 items-center justify-center rounded bg-run text-[10px] font-semibold text-white"
      >
        HG
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        {ITEMS.map((item) => {
          const href = `${base}${item.to}`;
          const active = item.end
            ? pathname === base
            : pathname.startsWith(href);
          return (
            <Link
              key={item.to || "dash"}
              href={href}
              title={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded ${
                active ? "text-run" : "text-white/70 hover:text-white"
              }`}
            >
              <item.icon />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="3" width="8" height="5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="10" width="8" height="11" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="7" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="18" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7.5 16 8.2M7.5 8.5 8.8 15.5M16.2 9.2 16.6 14.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
