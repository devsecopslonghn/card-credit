"use client";

import type { CatalogProductOption } from "@/components/cards/cardTypes";
import { CARD_IMAGE_PLACEHOLDER_URL, formatAnnualFee } from "@/components/cards/cardTypes";
import { getKeyboardNavigationIndex } from "@/lib/cards/accessibility.mjs";

type ProductPickerProps = {
  products: CatalogProductOption[];
  selectedPresetId: string;
  loading: boolean;
  error: string;
  providerSelected: boolean;
  onSelect: (product: CatalogProductOption) => void;
  onRetry: () => void;
};

export function ProductPicker({
  products,
  selectedPresetId,
  loading,
  error,
  providerSelected,
  onSelect,
  onRetry,
}: ProductPickerProps) {
  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, product: CatalogProductOption) => {
    const nextIndex = getKeyboardNavigationIndex(event.key, index, products.length);
    if (nextIndex !== null) {
      event.preventDefault();
      const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[data-product-option]")[
        nextIndex
      ];
      nextButton?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(product);
    }
  };

  return (
    <section aria-labelledby="product-picker-title">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 id="product-picker-title" className="text-sm font-bold text-gray-900">
          2. Chọn Card Product
        </h3>
        {error && (
          <button type="button" onClick={onRetry} className="text-xs font-semibold text-blue-600 hover:underline">
            Tải lại
          </button>
        )}
      </div>

      {!providerSelected && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500" role="status">
          Chọn provider trước để xem sản phẩm thẻ.
        </p>
      )}
      {providerSelected && loading && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500" role="status">
          Đang tải sản phẩm...
        </p>
      )}
      {providerSelected && !loading && error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {providerSelected && !loading && !error && products.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500" role="status">
          Provider này chưa có sản phẩm active.
        </p>
      )}

      {providerSelected && !loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-labelledby="product-picker-title">
          {products.map((product, index) => {
            const selected = selectedPresetId === product.presetId;
            const annualFee = formatAnnualFee(product.annualFee);
            return (
              <button
                key={product.presetId}
                type="button"
                data-product-option
                onClick={() => onSelect(product)}
                onKeyDown={(event) => handleOptionKeyDown(event, index, product)}
                role="radio"
                aria-checked={selected}
                aria-label={`${product.providerName} ${product.displayName}, ${product.network}, phí thường niên ${annualFee}`}
                className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <img
                  src={product.imageUrl || CARD_IMAGE_PLACEHOLDER_URL}
                  alt={`${product.providerName} ${product.displayName}`}
                  className="h-14 w-24 shrink-0 rounded-md bg-gray-50 object-contain"
                  onError={(event) => {
                    event.currentTarget.src = CARD_IMAGE_PLACEHOLDER_URL;
                  }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-gray-900">{product.displayName}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {product.providerName} · {product.network}
                  </span>
                  <span className="block text-xs font-semibold text-gray-700">Phí thường niên: {annualFee}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
