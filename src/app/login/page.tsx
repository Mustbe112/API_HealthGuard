"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, isReady } = useAuth();
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
      await login(email, password);
      router.push("/projects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workbench flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-text hover:text-run">
            API HealthGuard
          </Link>
          <p className="mt-1 text-sm text-text-muted">Sign in to your projects</p>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-run"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-fail">{error}</p>}

          <Button type="submit" disabled={loading || !isReady} className="w-full !bg-run !text-white">
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          No account?{" "}
          <Link href="/signup" className="text-link hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
