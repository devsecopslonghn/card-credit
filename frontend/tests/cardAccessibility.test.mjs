import assert from "node:assert/strict";
import { test } from "node:test";
import { getKeyboardNavigationIndex, getWrappedIndex } from "../lib/cards/accessibility.mjs";

test("wrapped index moves through picker options", () => {
  assert.equal(getWrappedIndex(0, 3, 1), 1);
  assert.equal(getWrappedIndex(2, 3, 1), 0);
  assert.equal(getWrappedIndex(0, 3, -1), 2);
  assert.equal(getWrappedIndex(-1, 3, 1), 0);
  assert.equal(getWrappedIndex(99, 3, -1), 2);
  assert.equal(getWrappedIndex(0, 0, 1), -1);
});

test("keyboard navigation maps arrow home and end keys", () => {
  assert.equal(getKeyboardNavigationIndex("ArrowDown", 1, 4), 2);
  assert.equal(getKeyboardNavigationIndex("ArrowRight", 3, 4), 0);
  assert.equal(getKeyboardNavigationIndex("ArrowUp", 0, 4), 3);
  assert.equal(getKeyboardNavigationIndex("ArrowLeft", 2, 4), 1);
  assert.equal(getKeyboardNavigationIndex("Home", 2, 4), 0);
  assert.equal(getKeyboardNavigationIndex("End", 2, 4), 3);
  assert.equal(getKeyboardNavigationIndex("Tab", 2, 4), null);
});
