"use client";

import { MAX_OWNER_LENGTH } from "@/components/cards/cardTypes";

type OwnerFieldProps = {
  id?: string;
  value: string;
  error?: string;
  ownerOptions?: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function OwnerField({ id = "card-owner", value, error, ownerOptions = [], disabled, onChange }: OwnerFieldProps) {
  const listId = ownerOptions.length > 0 ? `${id}-options` : undefined;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-1">
        Chủ thẻ
      </label>
      <input
        id={id}
        name="owner"
        value={value}
        maxLength={MAX_OWNER_LENGTH}
        list={listId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        autoComplete="name"
        placeholder="Ví dụ: Long Ho, Tôi, Mẹ"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        onChange={(event) => onChange(event.target.value)}
      />
      {ownerOptions.length > 0 && (
        <datalist id={listId}>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner} />
          ))}
        </datalist>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
