"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { canManageCatalog } from "@/lib/auth/rbac";

type Product = {
  presetId: string;
  providerName: string;
  displayName: string;
  network: string;
  imageUrl: string | null;
  active: boolean;
  imageCache: {
    status: "MISSING" | "VERIFIED" | "BROKEN";
    byteSize?: number;
    checkedAt?: string | null;
    errorMessage?: string | null;
  };
};
type User = { role: "admin" | "user" };
const errorText = async (response: Response) => ((await response.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "Không thể xử lý yêu cầu.";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

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

  // The initial request hydrates this client-only admin table from the API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch((value) => setError(value instanceof Error ? value.message : "Không thể tải catalog.")).finally(() => setLoading(false)); }, []);

  const saveImageUrl = async (product: Product) => {
    const imageUrl = imageUrls[product.presetId]?.trim() ?? "";
    if (!isHttpUrl(imageUrl)) {
      setError("Link ảnh phải là URL http:// hoặc https:// hợp lệ.");
      return;
    }
    setSaving(product.presetId);
    setError("");
    try {
      const update = await fetch(`/api/admin/card-catalog/products/${product.presetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!update.ok) throw new Error(await errorText(update));
      const sync = await fetch(`/api/admin/card-catalog/products/${product.presetId}/image-sync`, { method: "POST" });
      if (!sync.ok) throw new Error(await errorText(sync));
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Không thể cập nhật link ảnh.");
    } finally {
      setSaving(null);
    }
  };

  return <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 md:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-3xl font-bold">Quản lý Card Catalog</h1><p className="mt-1 text-sm text-gray-500">Cập nhật link ảnh và đồng bộ ảnh cache trong MongoDB.</p></div><Link href="/profile" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Hồ sơ</Link></div>{loading && <p role="status" className="rounded-lg bg-white p-4">Đang tải catalog...</p>}{!loading && user && !canManageCatalog(user) && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">Bạn không có quyền quản lý catalog.</p>}{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}{!loading && user && canManageCatalog(user) && <div className="overflow-x-auto rounded-lg border bg-white shadow-sm"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b bg-gray-50"><tr><th className="p-4">Provider</th><th className="p-4">Card Product</th><th className="p-4">Network</th><th className="p-4">Image URL</th><th className="p-4">Ảnh cache</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead><tbody>{products.map((product) => <tr key={product.presetId} className="border-b last:border-0"><td className="p-4 font-medium">{product.providerName}</td><td className="p-4">{product.displayName}<div className="text-xs text-gray-400">{product.presetId}</div></td><td className="p-4">{product.network}</td><td className="p-4"><label htmlFor={`image-url-${product.presetId}`} className="sr-only">Link ảnh {product.displayName}</label><input id={`image-url-${product.presetId}`} value={imageUrls[product.presetId] ?? ""} onChange={(event) => setImageUrls((current) => ({ ...current, [product.presetId]: event.target.value }))} placeholder="https://..." className="cc-control w-full min-w-72 rounded-lg px-3 py-2 text-sm" /></td><td className="p-4">{product.imageCache.byteSize && product.imageCache.byteSize > 0 ? <img src={`/api/card-catalog/products/${product.presetId}/image`} alt={product.displayName} className="h-16 w-24 rounded object-contain" /> : <span className="text-gray-400">Chưa có</span>}</td><td className="p-4"><span className={product.imageCache.status === "VERIFIED" ? "text-emerald-700" : "text-amber-700"}>{product.imageCache.status}</span>{product.imageCache.errorMessage && <div className="max-w-xs text-xs text-red-600">{product.imageCache.errorMessage}</div>}</td><td className="p-4 text-right"><button type="button" disabled={saving === product.presetId} onClick={() => void saveImageUrl(product)} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{saving === product.presetId ? "Đang lưu..." : "Lưu link & sync"}</button></td></tr>)}</tbody></table></div>}</div></main>;
}
