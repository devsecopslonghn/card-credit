"use client";

import Link from "next/link";
import { useState } from "react";
import { parseAuthSessionResponse } from "@/lib/api/authSessionCore.mjs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message || "Không thể đăng nhập.");
      }

      parseAuthSessionResponse(await response.json());

      const nextPath = new URLSearchParams(window.location.search).get("next");
      window.location.href = nextPath?.startsWith("/") ? nextPath : "/cards";
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Không thể đăng nhập.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="cc-page flex min-h-screen items-center justify-center px-4 py-8">
      <form onSubmit={handleSubmit} className="cc-section w-full max-w-sm p-6 sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06b6d4] font-bold text-white">C</span>
          <div><p className="text-lg font-bold cc-text-primary">Card Credit</p><p className="text-xs cc-text-muted">Premium fintech workspace</p></div>
        </div>
        <h1 className="text-2xl font-bold cc-text-primary">Đăng nhập</h1>
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wider cc-text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="cc-control w-full rounded-lg px-3 py-2.5 outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wider cc-text-muted">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="cc-control w-full rounded-lg px-3 py-2.5 outline-none"
              required
            />
          </div>
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-[#06b6d4] px-4 py-2.5 font-semibold text-white hover:bg-[#0891b2] disabled:opacity-60"
        >
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-medium text-[#00687a] hover:text-[#0891b2]">
            Quên mật khẩu?
          </Link>
          <Link href="/register" className="font-medium cc-text-muted hover:text-[#0b1c30]">
            Tạo tài khoản
          </Link>
        </div>
      </form>
    </main>
  );
}
