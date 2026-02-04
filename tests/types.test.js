import assert from "node:assert/strict";
import test from "node:test";

// Test the types module
test("types module exports expected interfaces and functions", async () => {
  const types = await import("../dist/utils/types.js");

  // Check that isError function exists and works correctly
  assert.equal(typeof types.isError, "function");
});

test("isError correctly identifies Error objects", async () => {
  const { isError } = await import("../dist/utils/types.js");

  // Should return true for Error instances
  assert.equal(isError(new Error("test")), true);
  assert.equal(isError(new TypeError("test")), true);
  assert.equal(isError(new RangeError("test")), true);

  // Should return false for non-Error values
  assert.equal(isError("string error"), false);
  assert.equal(isError(123), false);
  assert.equal(isError(null), false);
  assert.equal(isError(undefined), false);
  assert.equal(isError({}), false);
  assert.equal(isError({ message: "fake error" }), false);
});

test("isError works with Node.js ErrnoException", async () => {
  const { isError } = await import("../dist/utils/types.js");

  // Create an error similar to Node.js ErrnoException
  const err = new Error("ENOENT: no such file");
  err.code = "ENOENT";
  err.errno = -2;
  err.syscall = "open";
  err.path = "/some/path";

  assert.equal(isError(err), true);
});
