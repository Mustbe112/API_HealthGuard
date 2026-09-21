"use client";

import type { ButtonHTMLAttributes } from "react";

export function RunButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`shrink-0 rounded bg-run px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
