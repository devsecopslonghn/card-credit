"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ForgotPasswordPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");
    setResetLink("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { message?: string; resetLink?: string; error?: { message?: string } };

      if (!response.ok) throw new Error(body.error?.message || "Không thể tạo yêu cầu đặt lại mật khẩu.");
      setStatus(body.message || "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.");
      if (body.resetLink) setResetLink(body.resetLink);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo yêu cầu đặt lại mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) throw new Error(body.error?.message || "Không thể đặt lại mật khẩu.");
      setStatus("Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.");
      setPassword("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <form
        onSubmit={token ? resetPassword : requestReset}
        className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-gray-900">{token ? "Đặt lại mật khẩu" : "Quên mật khẩu"}</h1>
        <div className="mt-6 space-y-4">
          {token ? (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-900">
                Mật khẩu mới
              </label>
              <input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          ) : (
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
        </div>
        {status && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700" role="status">
            {status}
          </p>
        )}
        {resetLink && (
          <a href={resetLink} className="mt-3 block break-all rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800">
            {resetLink}
          </a>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Đang xử lý..." : token ? "Đặt lại mật khẩu" : "Gửi yêu cầu"}
        </button>
        <p className="mt-5 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-700 hover:text-blue-800">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </main>
  );
}
