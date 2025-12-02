import assert from "node:assert/strict";
import test from "node:test";

import { prefixCache } from "../dist/utils/collections.js";

test("prefixCache evicts oldest entries when over capacity", () => {
  // Cache size limit is 2048 entries; overfilling should evict the oldest keys.
  prefixCache.clear();

  const max = 2048;
  const total = max + 2;

  for (let i = 0; i < total; i++) {
    prefixCache.set(`key-${i}`, `value-${i}`);
  }

  assert.equal(prefixCache.size, max);

  // The first two keys should have been evicted
  assert.equal(prefixCache.has("key-0"), false);
  assert.equal(prefixCache.has("key-1"), false);

  // Newest keys should still be present
  assert.equal(prefixCache.get("key-2048"), "value-2048");
  assert.equal(prefixCache.get("key-2049"), "value-2049");
});
