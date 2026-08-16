"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { canManageUsers } from "@/lib/auth/rbac";
import { CalendarSubscriptionSettings } from "@/components/CalendarSubscriptionSettings";
import type { UserDto } from "@card-credit/contracts";
import { parseUserResponse } from "@/lib/api/userCore.mjs";

type ApiErrorBody = {
  error?: {
    message?: string;
    fields?: Record<string, string>;
  };
};

const readError = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  return body.error?.fields?.displayName ?? body.error?.message ?? "Không thể cập nhật hồ sơ.";
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return parseUserResponse(await response.json());
      })
      .then(({ user: nextUser }) => {
        if (!active) return;
        setUser(nextUser);
        setDisplayName(nextUser.displayName);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : "Không thể tải hồ sơ.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = parseUserResponse(await response.json());
      setUser(body.user);
      setDisplayName(body.user.displayName);
      setStatus("Đã cập nhật hồ sơ.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="cc-page min-h-screen px-4 py-8 text-gray-900 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-blue-700">TÀI KHOẢN</p>
            <h1 className="text-3xl font-semibold tracking-tight">Hồ sơ người dùng</h1>
            <p className="mt-1 text-sm text-gray-500">Thông tin cá nhân, bảo mật và lịch thanh toán.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/cards" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              Danh sách thẻ
            </Link>
            {user && canManageUsers(user) ? (
              <Link href="/admin/users" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                Admin Console
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>

        <section className="cc-section rounded-xl p-6">
          {loading ? <p role="status" className="text-sm text-gray-500">Đang tải hồ sơ...</p> : null}
          {!loading && user ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-semibold text-gray-500">Email</dt>
                  <dd className="mt-1 break-words text-base font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-500">Role</dt>
                  <dd className="mt-1 text-base font-medium">{user.role}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-500">Workspace</dt>
                  <dd className="mt-1 break-words text-base font-medium">{user.workspaceId}</dd>
                </div>
              </dl>

              <form onSubmit={handleSubmit} className="mt-6 border-t border-gray-100 pt-6">
                <label htmlFor="displayName" className="block text-sm font-semibold text-gray-900">
                  Display name
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="displayName"
                    value={displayName}
                    maxLength={80}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </form>
            </>
          ) : null}
          {status ? <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{status}</p> : null}
          {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        </section>
        {!loading && user ? <CalendarSubscriptionSettings /> : null}
      </div>
    </main>
  );
}
