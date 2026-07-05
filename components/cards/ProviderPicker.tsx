"use client";

import type { CatalogProviderOption } from "@/components/cards/cardTypes";
import { getKeyboardNavigationIndex } from "@/lib/cards/accessibility.mjs";

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
  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, providerCode: string) => {
    const nextIndex = getKeyboardNavigationIndex(event.key, index, providers.length);
    if (nextIndex !== null) {
      event.preventDefault();
      const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[data-provider-option]")[
        nextIndex
      ];
      nextButton?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(providerCode);
    }
  };

  return (
    <section aria-labelledby="provider-picker-title">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 id="provider-picker-title" className="text-sm font-bold text-gray-900">
          1. Chọn provider
        </h3>
        {error && (
          <button type="button" onClick={onRetry} className="text-xs font-semibold text-blue-600 hover:underline">
            Tải lại
          </button>
        )}
      </div>

      {loading && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500" role="status">
          Đang tải provider...
        </p>
      )}
      {!loading && error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && providers.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500" role="status">
          Chưa có provider khả dụng.
        </p>
      )}

      {!loading && !error && providers.length > 0 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="provider-picker-title">
          {providers.map((provider, index) => {
            const selected = selectedProviderCode === provider.providerCode;
            return (
              <button
                key={provider.providerCode}
                type="button"
                data-provider-option
                onClick={() => onSelect(provider.providerCode)}
                onKeyDown={(event) => handleOptionKeyDown(event, index, provider.providerCode)}
                role="radio"
                aria-checked={selected}
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
