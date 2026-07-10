export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const getWrappedIndex = (currentIndex, itemCount, direction) => {
  if (!Number.isInteger(itemCount) || itemCount <= 0) return -1;
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= itemCount) {
    return direction >= 0 ? 0 : itemCount - 1;
  }

  return (currentIndex + direction + itemCount) % itemCount;
};

export const getKeyboardNavigationIndex = (key, currentIndex, itemCount) => {
  if (key === "Home") return itemCount > 0 ? 0 : -1;
  if (key === "End") return itemCount > 0 ? itemCount - 1 : -1;
  if (key === "ArrowRight" || key === "ArrowDown") return getWrappedIndex(currentIndex, itemCount, 1);
  if (key === "ArrowLeft" || key === "ArrowUp") return getWrappedIndex(currentIndex, itemCount, -1);
  return null;
};

export const getFocusableElements = (container) =>
  Array.from(container?.querySelectorAll?.(FOCUSABLE_SELECTOR) ?? []).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
