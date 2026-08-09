"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { canManageCatalog } from "@/lib/auth/rbac";

type Product = { presetId: string; providerName: string; displayName: string; network: string; imageUrl: string | null };
type User = { role: "admin" | "user" };

const errorText = async (response: Response) =>
  ((await response.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "Không thể xử lý yêu cầu.";

export default function AdminCardCatalogPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const profile = await fetch("/api/profile", { cache: "no-store" });
    const profileBody = (await profile.json()) as { user: User };
    setUser(profileBody.user);
    if (!canManageCatalog(profileBody.user)) return;
    const response = await fetch("/api/admin/card-catalog/products", { cache: "no-store" });
    if (!response.ok) throw new Error(await errorText(response));
    const nextProducts = ((await response.json()) as { data: Product[] }).data;
    setProducts(nextProducts);
    setImageUrls(Object.fromEntries(nextProducts.map((product) => [product.presetId, product.imageUrl ?? ""])));
  };

  useEffect(() => {
    void load()
      .catch((value) => setError(value instanceof Error ? value.message : "Không thể tải catalog."))
      .finally(() => setLoading(false));
  }, []);

  const saveImageUrl = async (product: Product) => {
    const imageUrl = imageUrls[product.presetId]?.trim() ?? "";
    if (!/^https?:\/\//i.test(imageUrl)) {
      setError("Link ảnh phải là URL http:// hoặc https://.");
      return;
    }
    setSaving(product.presetId);
    setError("");
    try {
      const response = await fetch(`/api/admin/card-catalog/products/${product.presetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!response.ok) throw new Error(await errorText(response));
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Không thể lưu link ảnh.");
    } finally {
      setSaving(null);
    }
  };

  const isAdmin = user && canManageCatalog(user);

  return (
    <main className="cc-page min-h-screen px-4 py-8 text-gray-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-600">ADMIN CONSOLE</p>
            <h1 className="text-3xl font-semibold tracking-tight">Card Catalog</h1>
            <p className="mt-1 text-sm text-gray-500">Quản lý hình ảnh cho các sản phẩm thẻ trong danh mục.</p>
          </div>
          <Link href="/cards" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
            ← User Dashboard
          </Link>
        </header>

        {loading ? <p role="status" className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">Đang tải catalog...</p> : null}
        {!loading && user && !isAdmin ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">Bạn không có quyền quản lý catalog.</p> : null}
        {error ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p> : null}

        {!loading && user && isAdmin ? (
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Danh sách card catalog">
            <div className="flex flex-col justify-between gap-2 border-b border-gray-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-gray-900">Sản phẩm thẻ</h2>
                <p className="mt-1 text-xs text-gray-500">Cập nhật URL ảnh được dùng khi người dùng thêm thẻ.</p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">{products.length} sản phẩm</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-white text-xs font-bold uppercase tracking-wide text-gray-500">
                  <tr><th className="p-4">Provider</th><th className="p-4">Card Product</th><th className="p-4">Network</th><th className="p-4">Image URL</th><th className="p-4 text-right">Thao tác</th></tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.presetId} className="border-b border-gray-100 last:border-0 hover:bg-slate-50">
                      <td className="p-4 font-semibold text-gray-800">{product.providerName}</td>
                      <td className="p-4 font-medium">{product.displayName}<div className="mt-1 text-xs text-gray-400">{product.presetId}</div></td>
                      <td className="p-4"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{product.network}</span></td>
                      <td className="p-4"><label htmlFor={`image-url-${product.presetId}`} className="sr-only">Link ảnh {product.displayName}</label><input id={`image-url-${product.presetId}`} value={imageUrls[product.presetId] ?? ""} onChange={(event) => setImageUrls((current) => ({ ...current, [product.presetId]: event.target.value }))} placeholder="https://..." className="cc-control w-full min-w-72 rounded-lg px-3 py-2 text-sm" /></td>
                      <td className="p-4 text-right"><button type="button" disabled={saving === product.presetId} onClick={() => void saveImageUrl(product)} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving === product.presetId ? "Đang lưu..." : "Lưu"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
