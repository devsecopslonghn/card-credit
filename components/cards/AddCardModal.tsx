"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCatalogProducts, fetchCatalogProviders } from "@/lib/api/cardCatalogClient";
import { createCard } from "@/lib/api/cardsClient";
import { OwnerField } from "@/components/cards/OwnerField";
import { ProductPicker } from "@/components/cards/ProductPicker";
import { ProviderPicker } from "@/components/cards/ProviderPicker";
import { getFocusableElements } from "@/lib/cards/accessibility.mjs";
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  buildCreateCardPayload,
  formatAnnualFee,
  normalizeOwnerInput,
  validateOwnerInput,
  type CatalogProductOption,
  type CatalogProviderOption,
} from "@/components/cards/cardTypes";

type AddCardModalProps = {
  open: boolean;
  ownerOptions: string[];
  onClose: () => void;
  onCreated: () => void;
  onSuccess: (message: string) => void;
};

export function AddCardModal({ open, ownerOptions, onClose, onCreated, onSuccess }: AddCardModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<CatalogProviderOption[]>([]);
  const [products, setProducts] = useState<CatalogProductOption[]>([]);
  const [selectedProviderCode, setSelectedProviderCode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProductOption | null>(null);
  const [owner, setOwner] = useState("Tôi");
  const [ownerError, setOwnerError] = useState("");
  const [providerLoading, setProviderLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [productError, setProductError] = useState("");
  const [createError, setCreateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.providerCode === selectedProviderCode),
    [providers, selectedProviderCode],
  );

  const resetForm = useCallback(() => {
    setProducts([]);
    setSelectedProviderCode("");
    setSelectedProduct(null);
    setOwner("Tôi");
    setOwnerError("");
    setProductError("");
    setCreateError("");
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const loadProviders = useCallback(async () => {
    setProviderLoading(true);
    setProviderError("");
    try {
      setProviders(await fetchCatalogProviders());
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Không thể tải provider.");
    } finally {
      setProviderLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async (providerCode: string) => {
    if (!providerCode) return;
    setProductLoading(true);
    setProductError("");
    try {
      setProducts(await fetchCatalogProducts(providerCode));
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Không thể tải sản phẩm thẻ.");
    } finally {
      setProductLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => void loadProviders(), 0);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => window.clearTimeout(timeoutId);
  }, [loadProviders, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements<HTMLElement>(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialogRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isSubmitting, open]);

  if (!open) return null;

  const handleProviderSelect = (providerCode: string) => {
    setSelectedProviderCode(providerCode);
    setSelectedProduct(null);
    setProducts([]);
    setProductError("");
    setCreateError("");
    void loadProducts(providerCode);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");

    if (!selectedProviderCode) {
      setCreateError("Vui lòng chọn provider.");
      return;
    }

    if (!selectedProduct) {
      setCreateError("Vui lòng chọn Card Product.");
      return;
    }

    const ownerValidation = validateOwnerInput(owner);
    setOwner(ownerValidation.owner);
    setOwnerError(ownerValidation.message);
    if (!ownerValidation.valid) return;

    setIsSubmitting(true);
    try {
      await createCard(buildCreateCardPayload(selectedProduct.presetId, ownerValidation.owner));
      resetForm();
      onClose();
      onCreated();
      onSuccess("Đã thêm thẻ mới.");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Không thể tạo thẻ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-card-title"
        aria-describedby="add-card-description"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-surface shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b cc-border bg-surface px-5 py-4">
          <div>
            <h2 id="add-card-title" className="text-lg font-bold cc-text-primary">
              Thêm thẻ từ Card Catalog
            </h2>
            <p id="add-card-description" className="text-sm font-medium cc-text-muted">
              Chọn provider, chọn Card Product, xem phí thường niên rồi nhập chủ thẻ.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Đóng modal thêm thẻ"
            className="rounded-lg p-2 cc-text-muted outline-none hover:bg-surface-elevated focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} aria-describedby={createError ? "add-card-submit-error" : undefined} className="space-y-5 p-5">
          <ProviderPicker
            providers={providers}
            selectedProviderCode={selectedProviderCode}
            loading={providerLoading}
            error={providerError}
            onSelect={handleProviderSelect}
            onRetry={loadProviders}
          />

          <ProductPicker
            products={products}
            selectedPresetId={selectedProduct?.presetId ?? ""}
            providerSelected={Boolean(selectedProviderCode)}
            loading={productLoading}
            error={productError}
            onSelect={(product) => {
              setSelectedProduct(product);
              setCreateError("");
            }}
            onRetry={() => loadProducts(selectedProviderCode)}
          />

          {selectedProduct && (
            <section aria-labelledby="product-preview-title" className="cc-panel rounded-lg p-4">
              <h3 id="product-preview-title" className="mb-3 text-sm font-bold cc-text-primary">
                3. Xem trước thông tin sản phẩm
              </h3>
              <div className="flex flex-col gap-4 sm:flex-row">
                <img
                  src={selectedProduct.imageUrl || CARD_IMAGE_PLACEHOLDER_URL}
                  alt={`${selectedProduct.providerName} ${selectedProduct.displayName}`}
                  className="aspect-[16/10] w-full rounded-lg bg-white object-contain sm:w-48"
                  onError={(event) => {
                    event.currentTarget.src = CARD_IMAGE_PLACEHOLDER_URL;
                  }}
                />
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-semibold cc-text-muted">{selectedProvider?.providerName ?? selectedProduct.providerName}</p>
                  <p className="break-words text-lg font-bold cc-text-primary">{selectedProduct.displayName}</p>
                  <p className="font-medium cc-text-muted">Network: {selectedProduct.network}</p>
                  <p className="font-bold cc-text-primary">Phí thường niên: {formatAnnualFee(selectedProduct.annualFee)}</p>
                </div>
              </div>
            </section>
          )}

          <OwnerField
            id="add-card-owner"
            value={owner}
            error={ownerError}
            ownerOptions={ownerOptions}
            disabled={isSubmitting}
            onChange={(value) => {
              setOwner(value);
              if (ownerError) setOwnerError(validateOwnerInput(value).message);
              if (createError) setCreateError("");
            }}
          />

          {createError && (
            <p
              id="add-card-submit-error"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
              role="alert"
            >
              {createError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t cc-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg px-5 py-2.5 font-semibold cc-text-primary outline-none hover:bg-surface-elevated focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || providerLoading || productLoading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white outline-none hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                const normalizedOwner = normalizeOwnerInput(owner);
                if (normalizedOwner !== owner) setOwner(normalizedOwner);
              }}
            >
              {isSubmitting ? "Đang tạo..." : "Tạo thẻ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
