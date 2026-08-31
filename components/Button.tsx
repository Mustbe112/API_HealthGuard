import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-accent text-ink hover:bg-accent-hover disabled:opacity-50",
  secondary:
    "bg-panel-raised text-text border border-line hover:border-accent/50 disabled:opacity-50",
  ghost: "text-text-muted hover:text-text disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
