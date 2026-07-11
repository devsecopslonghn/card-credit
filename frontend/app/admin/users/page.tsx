"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { canManageUsers } from "@/lib/auth/rbac";

type ManagedUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  workspaceId: string;
  displayName: string;
  active: boolean;
  lockedAt: string | null;
};

type ProfileResponse = {
  user: ManagedUser;
};

type UsersResponse = {
  users: ManagedUser[];
};

type ApiErrorBody = {
  error?: {
    message?: string;
    fields?: Record<string, string>;
  };
};

const readError = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  return body.error?.fields ? Object.values(body.error.fields).join(" ") : body.error?.message ?? "Không thể xử lý yêu cầu.";
};

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<ManagedUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Pick<ManagedUser, "displayName" | "role" | "workspaceId">>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const fetchUsersData = async () => {
    const profileResponse = await fetch("/api/profile", { cache: "no-store" });
    if (!profileResponse.ok) throw new Error(await readError(profileResponse));
    const profile = (await profileResponse.json()) as ProfileResponse;
    if (!canManageUsers(profile.user)) {
      return { profile: profile.user, users: [] };
    }

    const usersResponse = await fetch("/api/admin/users", { cache: "no-store" });
    if (!usersResponse.ok) throw new Error(await readError(usersResponse));
    const body = (await usersResponse.json()) as UsersResponse;
    return { profile: profile.user, users: body.users };
  };

  useEffect(() => {
    let active = true;
    void fetchUsersData()
      .then(({ profile, users }) => {
        if (!active) return;
        setCurrentUser(profile);
        setUsers(users);
        setDrafts(
          Object.fromEntries(
            users.map((user) => [
              user.id,
              {
                displayName: user.displayName,
                role: user.role,
                workspaceId: user.workspaceId,
              },
            ]),
          ),
        );
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách user.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateDraft = (id: string, field: "displayName" | "role" | "workspaceId", value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault();
    setSavingId(userId);
    setStatus("");
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[userId]),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { user: ManagedUser };
      setUsers((current) => current.map((user) => (user.id === userId ? body.user : user)));
      setDrafts((current) => ({
        ...current,
        [userId]: {
          displayName: body.user.displayName,
          role: body.user.role,
          workspaceId: body.user.workspaceId,
        },
      }));
      setStatus("Đã cập nhật user.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể cập nhật user.");
    } finally {
      setSavingId(null);
    }
  };

  const isAdmin = currentUser && canManageUsers(currentUser);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý user</h1>
            <p className="mt-1 text-sm text-gray-500">Cập nhật role và workspace bằng quyền admin.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              Hồ sơ
            </Link>
            <LogoutButton />
          </div>
        </div>

        {loading ? <p role="status" className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">Đang tải user...</p> : null}

        {!loading && !isAdmin ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            Bạn không có quyền quản lý người dùng.
          </p>
        ) : null}

        {!loading && isAdmin ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-500">
                    <th className="p-4">Email</th>
                    <th className="p-4">Display name</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Workspace</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const draft = drafts[user.id] ?? user;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 align-top last:border-b-0">
                        <td className="p-4 text-sm font-medium">
                          <div className="break-all">{user.email}</div>
                          {user.id === currentUser?.id ? <div className="mt-1 text-xs font-semibold text-emerald-700">Tài khoản hiện tại</div> : null}
                        </td>
                        <td className="p-4">
                          <form id={`user-form-${user.id}`} onSubmit={(event) => saveUser(event, user.id)}>
                            <label htmlFor={`displayName-${user.id}`} className="sr-only">Display name</label>
                            <input
                              id={`displayName-${user.id}`}
                              value={draft.displayName}
                              maxLength={80}
                              onChange={(event) => updateDraft(user.id, "displayName", event.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </form>
                        </td>
                        <td className="p-4">
                          <label htmlFor={`role-${user.id}`} className="sr-only">Role</label>
                          <select
                            id={`role-${user.id}`}
                            form={`user-form-${user.id}`}
                            value={draft.role}
                            onChange={(event) => updateDraft(user.id, "role", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <label htmlFor={`workspace-${user.id}`} className="sr-only">Workspace</label>
                          <input
                            id={`workspace-${user.id}`}
                            form={`user-form-${user.id}`}
                            value={draft.workspaceId}
                            maxLength={80}
                            onChange={(event) => updateDraft(user.id, "workspaceId", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-4 text-sm">
                          {user.active ? "Active" : "Inactive"}
                          {user.lockedAt ? <span className="block text-red-600">Locked</span> : null}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="submit"
                            form={`user-form-${user.id}`}
                            disabled={savingId === user.id}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {savingId === user.id ? "Đang lưu..." : "Lưu"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {status ? <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{status}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    </main>
  );
}
