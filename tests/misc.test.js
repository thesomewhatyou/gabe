import assert from "node:assert/strict";
import test from "node:test";

import { clean, isEmpty, safeBigInt, textDecode, textEncode } from "../dist/utils/misc.js";

test("textEncode encodes special characters and escape sequences", () => {
  const input = "&><\\n\\:\\,";
  const encoded = textEncode(input);

  assert.equal(encoded, "&amp;&gt;&lt;\n:,");
});

test("textDecode decodes basic HTML entities", () => {
  const input = "&lt;3 &amp; &gt;";
  const decoded = textDecode(input);

  assert.equal(decoded, "<3 & >");
});

test("clean hides mentions without touching environment variables when skipEnv is true", () => {
  const input = "Hello @everyone and @here";
  const cleaned = clean(input, true);

  // Mentions should be broken by a zero-width space so they do not ping
  assert.equal(cleaned, `Hello @\u200beveryone and @\u200bhere`);
});

test("isEmpty detects empty or whitespace-only strings", () => {
  assert.equal(isEmpty(""), true);
  assert.equal(isEmpty("   \t\n"), true);
  // Braille pattern blank is treated as whitespace in Gabe
  assert.equal(isEmpty("\u2800"), true);

  assert.equal(isEmpty("Gabe"), false);
  assert.equal(isEmpty(" Gabe "), false);
});

test("safeBigInt parses valid inputs and returns null on failure", () => {
  assert.equal(safeBigInt("123"), 123n);
  assert.equal(safeBigInt(456), 456n);
  assert.equal(safeBigInt(789n), 789n);
  assert.equal(safeBigInt(true), 1n);

  // Invalid BigInt input should not throw and instead return null
  assert.equal(safeBigInt("not-a-number"), null);
});
