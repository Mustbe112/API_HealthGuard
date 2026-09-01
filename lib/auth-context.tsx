"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { User } from "./types";

const TOKEN_KEY = "av_token";

interface AuthState {
  user: User | null;
  token: string | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setIsReady(true);
      return;
    }
    api
      .me(saved)
      .then(({ user: next }) => {
        setToken(saved);
        setUser(next);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsReady(true));
  }, []);

  async function login(email: string, password: string) {
    const { user: next, token: nextToken } = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, nextToken);
    setUser(next);
    setToken(nextToken);
  }

  async function signup(email: string, password: string) {
    const { user: next, token: nextToken } = await api.signup(email, password);
    localStorage.setItem(TOKEN_KEY, nextToken);
    setUser(next);
    setToken(nextToken);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isReady, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
