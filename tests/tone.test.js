import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const toneFiles = [
  "commands/moderation/mod/ban.js",
  "commands/moderation/mod/massban.js",
  "commands/moderation/mod/mute.js",
  "commands/moderation/mod/nickname.js",
  "commands/moderation/mod/slowmode.js",
  "commands/moderation/mod/unmute.js",
  "locales/en-US.json",
];

test("common user-facing copy avoids needlessly harsh wording", async () => {
  const text = (await Promise.all(toneFiles.map(async (file) => readFile(resolve(file), "utf8")))).join("\n");

  const harshWords = /\b(genius|dummy|nerds|wad|mofo|shaddup|suicide)\b/i;
  const harshPhrases = /shut up|your image is fat/i;

  assert.equal(harshWords.test(text), false);
  assert.equal(harshPhrases.test(text), false);
});
