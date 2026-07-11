declare module "@/lib/cards/accessibility.mjs" {
  export const FOCUSABLE_SELECTOR: string;
  export const getWrappedIndex: (currentIndex: number, itemCount: number, direction: number) => number;
  export const getKeyboardNavigationIndex: (
    key: string,
    currentIndex: number,
    itemCount: number,
  ) => number | null;
  export const getFocusableElements: <T extends Element = HTMLElement>(container: ParentNode | null | undefined) => T[];
}
