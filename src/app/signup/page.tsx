"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(email, password);
      router.push("/projects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workbench flex min-h-screen flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
        <BrandMark />
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-text">Create account</h1>
            <p className="mt-1 text-sm text-text-muted">Start monitoring an API</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-md border border-line bg-surface p-6"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-run"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-run"
                placeholder="At least 8 characters"
              />
            </div>

            {error && <p className="text-xs text-fail">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full !bg-run !text-white">
              {loading ? "Creating account…" : "Continue"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-link hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
