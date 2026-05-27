import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { aliases, commands, info, paths } from "#utils/collections.js";
import { load } from "#utils/handler.js";
import { cleanJoyInput, currentDayKey, seededPick } from "#utils/joy.js";
import AffirmCommand from "../commands/fun/misc/affirm.js";
import GabeCommand from "../commands/fun/misc/gabe.js";
import GratitudeCommand from "../commands/fun/misc/gratitude.js";
import TouchGrassCommand from "../commands/fun/misc/touchgrass.js";
import VibecheckCommand from "../commands/fun/misc/vibecheck.js";
import CelebrateCommand from "../commands/fun/random/celebrate.js";
import QuestCommand from "../commands/fun/random/quest.js";
import ComplimentCommand from "../commands/fun/social/compliment.js";
import RatioCommand from "../commands/fun/social/ratio.js";
import locale from "../locales/en-US.json" with { type: "json" };

const joyCommands = ["affirm", "gratitude", "vibecheck", "compliment", "celebrate", "quest"];

test("gabe responses stay friendly", () => {
  assert.ok(GabeCommand.responses.length >= 10);

  for (const response of GabeCommand.responses) {
    assert.equal(/\bfuck\b/.test(response), false);
    assert.equal(/\bhell\b/.test(response), false);
  }
});

test("joy helpers clean and pick stable values", () => {
  assert.equal(cleanJoyInput("  hello   joy  ", 20), "hello joy");
  assert.equal(cleanJoyInput("x".repeat(30), 12), "xxxxxxxxx...");
  assert.equal(cleanJoyInput("", 20), undefined);
  assert.equal(seededPick("same", ["a", "b", "c"], "test"), seededPick("same", ["a", "b", "c"], "test"));
  assert.equal(currentDayKey(86400000 * 42), 42);
});

test("affirmations are stable and kind", () => {
  const first = AffirmCommand.pick("gabe:affirm", AffirmCommand.affirmations);
  const second = AffirmCommand.pick("gabe:affirm", AffirmCommand.affirmations);

  assert.equal(first, second);
  assert.ok(first.length > 20);
  assert.equal(/\b(stupid|worthless|failure)\b/i.test(first), false);
});

test("gratitude notes clean input or provide prompt", () => {
  const withThing = GratitudeCommand.build("gabe:thanks", "  good   soup ");
  const withoutThing = GratitudeCommand.build("gabe:thanks", "");

  assert.equal(withThing.thing, "good soup");
  assert.equal(withThing.prompt, undefined);
  assert.ok(withThing.closer);
  assert.equal(withoutThing.thing, undefined);
  assert.ok(withoutThing.prompt);
});

test("gratitude input is capped", () => {
  assert.equal(GratitudeCommand.cleanThing("c".repeat(150)).length, 120);
});

test("vibecheck score is stable and bounded", () => {
  const first = VibecheckCommand.score("123:456");
  const second = VibecheckCommand.score("123:456");

  assert.equal(first, second);
  assert.ok(first >= 0);
  assert.ok(first <= 100);
});

test("vibecheck tiers cover the whole meter", () => {
  assert.equal(VibecheckCommand.tier(0).name, "sleepy");
  assert.equal(VibecheckCommand.tier(100).name, "legendary");
});

test("compliments are stable and non-empty", () => {
  const first = ComplimentCommand.pick("gabe:friend:today", ComplimentCommand.compliments);
  const second = ComplimentCommand.pick("gabe:friend:today", ComplimentCommand.compliments);

  assert.equal(first, second);
  assert.ok(first.length > 10);
});

test("celebration confetti is stable and bounded", () => {
  const first = CelebrateCommand.makeConfetti("gabe-party");
  const second = CelebrateCommand.makeConfetti("gabe-party");

  assert.equal(first, second);
  assert.equal(first.split(" ").length, 18);
});

test("celebration reason is cleaned and capped", () => {
  assert.equal(CelebrateCommand.cleanReason("   hello   world   "), "hello world");
  assert.equal(CelebrateCommand.cleanReason(""), undefined);
  assert.equal(CelebrateCommand.cleanReason("a".repeat(120)).length, 100);
});

test("quest generation is stable and complete", () => {
  const first = QuestCommand.build("gabe:quest", "friendship");
  const second = QuestCommand.build("gabe:quest", "friendship");

  assert.deepEqual(first, second);
  assert.equal(first.theme, "friendship");
  assert.ok(first.title);
  assert.ok(first.task);
  assert.ok(first.reward);
  assert.ok(first.difficulty);
});

test("quest theme is cleaned and capped", () => {
  assert.equal(QuestCommand.cleanTheme("  tiny    wins "), "tiny wins");
  assert.equal(QuestCommand.cleanTheme(""), undefined);
  assert.equal(QuestCommand.cleanTheme("b".repeat(100)).length, 80);
});

test("older fun command copy avoids harsh insults", () => {
  const text = [
    ...TouchGrassCommand.recommendations,
    ...TouchGrassCommand.messages.map((entry) => entry.message),
    ...RatioCommand.successMessages,
    ...RatioCommand.failMessages,
    ...RatioCommand.mildMessages,
  ].join("\n");

  assert.equal(/\bincel\b/i.test(text), false);
  assert.equal(/\bloser\b/i.test(text), false);
  assert.equal(/\biq\b/i.test(text), false);
});

test("joy commands have discoverable english metadata", () => {
  for (const command of joyCommands) {
    assert.ok(locale.commands.descriptions[command], `${command} should have a description`);
    assert.equal(locale.commands.names[command], command);
  }

  assert.equal(locale.commands.flagNames.affirm.user, "user");
  assert.equal(locale.commands.flagNames.gratitude.thing, "thing");
  assert.equal(locale.commands.flagNames.vibecheck.user, "user");
  assert.equal(locale.commands.flagNames.compliment.user, "user");
  assert.equal(locale.commands.flagNames.celebrate.reason, "reason");
  assert.equal(locale.commands.flagNames.quest.theme, "theme");
});

test("readme lists every joy command", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  for (const command of joyCommands) {
    assert.match(readme, new RegExp(`\\\`${command}\\\``));
  }
});

test("joy commands load through the bot command handler", async () => {
  for (const command of joyCommands) {
    commands.delete(command);
    info.delete(command);
    paths.delete(command);
  }
  for (const alias of ["affirmation", "grateful", "vibes", "hype", "party", "sidequest"]) {
    aliases.delete(alias);
  }

  const loaded = [];
  for (const [command, file] of [
    ["affirm", "commands/fun/misc/affirm.js"],
    ["gratitude", "commands/fun/misc/gratitude.js"],
    ["vibecheck", "commands/fun/misc/vibecheck.js"],
    ["compliment", "commands/fun/social/compliment.js"],
    ["celebrate", "commands/fun/random/celebrate.js"],
    ["quest", "commands/fun/random/quest.js"],
  ]) {
    loaded.push(await load(null, resolve(file), true));
    assert.ok(commands.has(command), `${command} should register`);
    assert.equal(info.get(command)?.slashAllowed, true);
  }

  assert.deepEqual(loaded, joyCommands);
  assert.equal(aliases.get("affirmation"), "affirm");
  assert.equal(aliases.get("grateful"), "gratitude");
  assert.equal(aliases.get("vibes"), "vibecheck");
  assert.equal(aliases.get("hype"), "compliment");
  assert.equal(aliases.get("party"), "celebrate");
  assert.equal(aliases.get("sidequest"), "quest");
});
