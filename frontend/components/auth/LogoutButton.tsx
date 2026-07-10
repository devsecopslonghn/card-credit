"use client";

import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
};

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

const readLogoutError = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  return body.error?.message ?? "Không thể đăng xuất.";
};

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readLogoutError(response));
      }

      window.location.assign("/login");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Không thể đăng xuất.");
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col items-stretch gap-1 sm:items-end ${className}`}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={submitting}
        className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm outline-none hover:bg-red-50 focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
      {error ? (
        <p role="alert" className="max-w-56 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
