import assert from "node:assert/strict";
import test from "node:test";

import { random } from "../dist/utils/misc.js";

test("random returns element from array", () => {
    const arr = ["a", "b", "c", "d", "e"];

    // Run multiple times to ensure it works
    for (let i = 0; i < 20; i++) {
        const result = random(arr);
        assert.equal(arr.includes(result), true, `Expected ${result} to be in array`);
    }
});

test("random returns the only element in single-item array", () => {
    const arr = ["only"];
    assert.equal(random(arr), "only");
});

test("textEncode and textDecode are inverses for basic entities", async () => {
    const { textEncode, textDecode } = await import("../dist/utils/misc.js");

    // textDecode(textEncode(x)) should produce expected transformations
    const original = "&><";
    const encoded = textEncode(original);
    assert.equal(encoded, "&amp;&gt;&lt;");

    const decoded = textDecode(encoded);
    assert.equal(decoded, original);
});

test("clean breaks up backticks to prevent code injection", async () => {
    const { clean } = await import("../dist/utils/misc.js");

    const input = "Some `code` here";
    const cleaned = clean(input, true);

    // Backticks should be followed by zero-width space
    assert.equal(cleaned.includes("`\u200b"), true);
});

test("isEmpty handles various whitespace characters", async () => {
    const { isEmpty } = await import("../dist/utils/misc.js");

    // Various empty strings
    assert.equal(isEmpty(""), true);
    assert.equal(isEmpty("   "), true);
    assert.equal(isEmpty("\t\n\r"), true);
    assert.equal(isEmpty("\u2800\u2800"), true); // Braille blanks

    // Non-empty strings
    assert.equal(isEmpty("hello"), false);
    assert.equal(isEmpty("  hello  "), false);
    assert.equal(isEmpty("0"), false);
});

test("safeBigInt handles edge cases", async () => {
    const { safeBigInt } = await import("../dist/utils/misc.js");

    // Valid conversions
    assert.equal(safeBigInt(0), 0n);
    assert.equal(safeBigInt("0"), 0n);
    assert.equal(safeBigInt(false), 0n);
    assert.equal(safeBigInt(-123), -123n);
    assert.equal(safeBigInt("-456"), -456n);

    // Very large numbers (Discord snowflakes)
    assert.equal(safeBigInt("1234567890123456789"), 1234567890123456789n);

    // Invalid conversions return null
    assert.equal(safeBigInt(""), null);
    assert.equal(safeBigInt("1.5"), null); // Floats don't work
    assert.equal(safeBigInt("abc"), null);
    assert.equal(safeBigInt("12abc34"), null);
});

test("safeBigInt handles very large Discord snowflake IDs", async () => {
    const { safeBigInt } = await import("../dist/utils/misc.js");

    // Real Discord snowflake examples
    const snowflake1 = "123456789012345678";
    const snowflake2 = "987654321098765432";

    assert.equal(safeBigInt(snowflake1), 123456789012345678n);
    assert.equal(safeBigInt(snowflake2), 987654321098765432n);

    // Minimum valid Discord snowflake (approximately)
    assert.equal(safeBigInt("21154535154122752"), 21154535154122752n);
});
