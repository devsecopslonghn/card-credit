"use client";

import type { CatalogProviderOption } from "@/components/cards/cardTypes";

type ProviderPickerProps = {
  providers: CatalogProviderOption[];
  selectedProviderCode: string;
  loading: boolean;
  error: string;
  onSelect: (providerCode: string) => void;
  onRetry: () => void;
};

export function ProviderPicker({
  providers,
  selectedProviderCode,
  loading,
  error,
  onSelect,
  onRetry,
}: ProviderPickerProps) {
  return (
    <section aria-labelledby="provider-picker-title">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 id="provider-picker-title" className="text-sm font-bold text-gray-900">
          1. Chọn provider
        </h4>
        {error && (
          <button type="button" onClick={onRetry} className="text-xs font-semibold text-blue-600 hover:underline">
            Tải lại
          </button>
        )}
      </div>

      {loading && <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">Đang tải provider...</p>}
      {!loading && error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && providers.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">Chưa có provider khả dụng.</p>
      )}

      {!loading && !error && providers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => {
            const selected = selectedProviderCode === provider.providerCode;
            return (
              <button
                key={provider.providerCode}
                type="button"
                onClick={() => onSelect(provider.providerCode)}
                aria-pressed={selected}
                className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-800 hover:border-blue-300"
                }`}
              >
                <span className="block truncate font-bold">{provider.providerName}</span>
                <span className="block text-xs text-gray-500">
                  {provider.providerCode} · {provider.products?.length ?? 0} sản phẩm
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
