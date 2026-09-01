"use client";

import type { ButtonHTMLAttributes } from "react";

export function RunButton({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="rounded bg-run px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      {...rest}
    >
      {children}
    </button>
  );
}
