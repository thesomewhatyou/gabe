import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { aliases, commands, info, paths } from "#utils/collections.js";
import { load, update } from "#utils/handler.js";
import { cleanJoyInput, currentDayKey, resolveJoyUser, seededPick } from "#utils/joy.js";
import AffirmCommand from "../commands/fun/misc/affirm.js";
import AnnoyCommand from "../commands/fun/misc/annoy.js";
import DieCommand from "../commands/fun/misc/die.js";
import GabeCommand from "../commands/fun/misc/gabe.js";
import GratitudeCommand from "../commands/fun/misc/gratitude.js";
import JoyCommand from "../commands/fun/misc/joy.js";
import TouchGrassCommand from "../commands/fun/misc/touchgrass.js";
import VibecheckCommand from "../commands/fun/misc/vibecheck.js";
import CelebrateCommand from "../commands/fun/random/celebrate.js";
import DiceCommand from "../commands/fun/random/dice.js";
import KindnessCommand from "../commands/fun/random/kindness.js";
import QuestCommand from "../commands/fun/random/quest.js";
import SparkCommand from "../commands/fun/random/spark.js";
import CheerCommand from "../commands/fun/social/cheer.js";
import ComplimentCommand from "../commands/fun/social/compliment.js";
import HighfiveCommand from "../commands/fun/social/highfive.js";
import RatioCommand from "../commands/fun/social/ratio.js";
import RoastCommand from "../commands/fun/social/roast.js";
import locale from "../locales/en-US.json" with { type: "json" };

const joyCommands = [
  "affirm",
  "gratitude",
  "joy",
  "vibecheck",
  "cheer",
  "compliment",
  "highfive",
  "celebrate",
  "kindness",
  "quest",
  "spark",
];

const joyCommandClasses = [
  AnnoyCommand,
  DieCommand,
  AffirmCommand,
  GratitudeCommand,
  JoyCommand,
  VibecheckCommand,
  DiceCommand,
  CheerCommand,
  ComplimentCommand,
  HighfiveCommand,
  CelebrateCommand,
  KindnessCommand,
  QuestCommand,
  SparkCommand,
];

function fakeCommand(CommandClass, overrides = {}) {
  return Object.assign(Object.create(CommandClass.prototype), {
    author: { id: "123", username: "tester" },
    args: [],
    guild: undefined,
    client: { users: new Map(), rest: { users: { get: async () => undefined } } },
    getOptionString: () => undefined,
    getOptionUser: () => undefined,
    ...overrides,
  });
}

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

test("joy helper resolves classic user inputs", async () => {
  const id = "21154535154122753";
  const user = { id, username: "friend" };
  const client = {
    users: new Map([[id, user]]),
    rest: {
      users: {
        get() {
          throw new Error("cache should satisfy this lookup");
        },
      },
    },
  };

  assert.equal(await resolveJoyUser({ client, options: { user: `<@${id}>` }, args: [] }), user);
  assert.equal(await resolveJoyUser({ client, options: {}, args: [] }), undefined);
});

test("joy command aliases are unique", () => {
  const seen = new Map();

  for (const CommandClass of joyCommandClasses) {
    for (const alias of CommandClass.aliases ?? []) {
      assert.equal(seen.has(alias), false, `${alias} is used by ${seen.get(alias)?.name} and ${CommandClass.name}`);
      seen.set(alias, CommandClass);
    }
  }
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

test("joy guide resolves exact and fuzzy needs", () => {
  const boost = JoyCommand.build("gabe:joy", "boost");
  const friend = JoyCommand.build("gabe:joy", "compliment");

  assert.equal(boost.key, "boost");
  assert.equal(friend.key, "friend");
  assert.ok(boost.commands.includes("affirm"));
  assert.ok(friend.commands.includes("cheer"));
  assert.ok(boost.closer);
});

test("vibecheck score is stable and bounded", () => {
  const first = VibecheckCommand.build("123:456");
  const second = VibecheckCommand.build("123:456");

  assert.deepEqual(first, second);
  assert.ok(first.score >= 0);
  assert.ok(first.score <= 100);
  assert.equal(first.bar.length, 10);
  assert.ok(first.tier);
  assert.ok(first.boost);
  assert.ok(first.advice);
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

test("cheers are stable and complete", () => {
  const first = CheerCommand.build("gabe:cheer", "green tests");
  const second = CheerCommand.build("gabe:cheer", "green tests");

  assert.deepEqual(first, second);
  assert.equal(first.reason, "green tests");
  assert.ok(first.chant);
  assert.ok(first.action);
  assert.ok(first.closer);
});

test("cheer reason is cleaned and capped", () => {
  assert.equal(CheerCommand.cleanReason("  tiny    win "), "tiny win");
  assert.equal(CheerCommand.cleanReason(""), undefined);
  assert.equal(CheerCommand.cleanReason("c".repeat(120)).length, 100);
});

test("high fives are stable and friendly", () => {
  const first = HighfiveCommand.build("gabe:highfive");
  const second = HighfiveCommand.build("gabe:highfive");

  assert.deepEqual(first, second);
  assert.ok(first.style.includes("high five"));
  assert.ok(first.effect.length > 10);
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

test("kindness missions are stable and complete", () => {
  const first = KindnessCommand.build("gabe:kindness", "friendship");
  const second = KindnessCommand.build("gabe:kindness", "friendship");

  assert.deepEqual(first, second);
  assert.equal(first.theme, "friendship");
  assert.ok(first.prompt);
  assert.ok(first.recipient);
  assert.ok(first.reward);
  assert.ok(first.closer);
});

test("kindness theme is cleaned and capped", () => {
  assert.equal(KindnessCommand.cleanTheme("  tiny    good "), "tiny good");
  assert.equal(KindnessCommand.cleanTheme(""), undefined);
  assert.equal(KindnessCommand.cleanTheme("c".repeat(100)).length, 80);
});

test("spark generation is stable and complete", () => {
  const first = SparkCommand.build("gabe:spark", "momentum");
  const second = SparkCommand.build("gabe:spark", "momentum");

  assert.deepEqual(first, second);
  assert.equal(first.theme, "momentum");
  assert.ok(first.spark);
  assert.ok(first.action);
  assert.ok(first.charm);
});

test("spark theme is cleaned and capped", () => {
  assert.equal(SparkCommand.cleanTheme("  tiny    joy "), "tiny joy");
  assert.equal(SparkCommand.cleanTheme(""), undefined);
  assert.equal(SparkCommand.cleanTheme("c".repeat(100)).length, 80);
});

test("joy command run outputs are useful and formatted", async () => {
  const joy = await JoyCommand.prototype.run.call(
    fakeCommand(JoyCommand, {
      getOptionString: (name) => (name === "need" ? "friend" : undefined),
    }),
  );
  const gratitude = await GratitudeCommand.prototype.run.call(
    fakeCommand(GratitudeCommand, {
      args: ["good", "tests"],
    }),
  );
  const vibe = await VibecheckCommand.prototype.run.call(fakeCommand(VibecheckCommand));
  const celebrate = await CelebrateCommand.prototype.run.call(
    fakeCommand(CelebrateCommand, {
      args: ["green", "tests"],
    }),
  );
  const spark = await SparkCommand.prototype.run.call(
    fakeCommand(SparkCommand, {
      args: ["momentum"],
    }),
  );
  const kindness = await KindnessCommand.prototype.run.call(
    fakeCommand(KindnessCommand, {
      args: ["friendship"],
    }),
  );

  assert.match(joy, /\*\*gabe joy guide\*\*/);
  assert.match(joy, /`compliment` -> `cheer` -> `highfive`/);
  assert.match(gratitude, /\*\*gabe gratitude note\*\*/);
  assert.match(gratitude, /good tests/);
  assert.match(vibe, /\*\*gabe vibecheck for <@123>\*\*/);
  assert.match(vibe, /vibe meter: [#-]{10} \d+%/);
  assert.match(celebrate, /\*\*gabe celebration protocol\*\*/);
  assert.match(celebrate, /celebrating: green tests/);
  assert.match(spark, /\*\*gabe joy spark\*\*/);
  assert.match(spark, /theme: momentum/);
  assert.match(kindness, /\*\*gabe kindness mission\*\*/);
  assert.match(kindness, /theme: friendship/);
});

test("social joy command run outputs mention targets", async () => {
  const friend = { id: "456", username: "friend" };
  const cheer = await CheerCommand.prototype.run.call(
    fakeCommand(CheerCommand, {
      getOptionUser: () => friend,
      getOptionString: (name) => (name === "reason" ? "big try" : undefined),
    }),
  );
  const cheerWithUserFlag = await CheerCommand.prototype.run.call(
    fakeCommand(CheerCommand, {
      args: ["big", "try"],
      options: { user: friend.id },
      getOptionUser: () => friend,
    }),
  );
  const compliment = await ComplimentCommand.prototype.run.call(
    fakeCommand(ComplimentCommand, {
      getOptionUser: () => friend,
    }),
  );
  const highfive = await HighfiveCommand.prototype.run.call(
    fakeCommand(HighfiveCommand, {
      getOptionUser: () => friend,
    }),
  );

  assert.match(cheer, /\*\*gabe cheer for <@456>\*\*/);
  assert.match(cheer, /reason: big try/);
  assert.match(cheerWithUserFlag, /reason: big try/);
  assert.match(compliment, /^<@456> /);
  assert.match(highfive, /<@123> gives <@456> a high five/);
});

test("older fun command copy avoids harsh insults", () => {
  const text = [
    ...AnnoyCommand.responses,
    AnnoyCommand.description,
    ...DieCommand.responses,
    DieCommand.description,
    ...JoyCommand.moods.flatMap((mood) => [mood.label, mood.plan, ...mood.commands]),
    ...JoyCommand.closers,
    ...RoastCommand.roasts,
    ...CheerCommand.chants,
    ...CheerCommand.actions,
    ...CheerCommand.closers,
    ...HighfiveCommand.styles,
    ...HighfiveCommand.effects,
    ...KindnessCommand.prompts,
    ...KindnessCommand.recipients,
    ...KindnessCommand.rewards,
    ...KindnessCommand.closers,
    ...SparkCommand.sparks,
    ...SparkCommand.actions,
    ...SparkCommand.charms,
    ...TouchGrassCommand.recommendations,
    ...TouchGrassCommand.messages.map((entry) => entry.message),
    ...RatioCommand.successMessages,
    ...RatioCommand.failMessages,
    ...RatioCommand.mildMessages,
  ].join("\n");

  assert.equal(/\bincel\b/i.test(text), false);
  assert.equal(/\bloser\b/i.test(text), false);
  assert.equal(/\biq\b/i.test(text), false);
  assert.equal(/\b(douchebag|hell|kill|piss|die|coward)\b/i.test(text), false);
  assert.equal(/credit card|family up on ebay/i.test(text), false);
});

test("joy commands have discoverable english metadata", () => {
  for (const command of joyCommands) {
    assert.ok(locale.commands.descriptions[command], `${command} should have a description`);
    assert.equal(locale.commands.names[command], command);
  }

  assert.equal(locale.commands.descriptions.annoy, AnnoyCommand.description);
  assert.equal(locale.commands.descriptions.die, DieCommand.description);
  assert.equal(locale.commands.flagNames.affirm.user, "user");
  assert.equal(locale.commands.flagNames.gratitude.thing, "thing");
  assert.equal(locale.commands.flagNames.joy.need, "need");
  assert.equal(locale.commands.flagNames.cheer.user, "user");
  assert.equal(locale.commands.flagNames.cheer.reason, "reason");
  assert.equal(locale.commands.flagNames.vibecheck.user, "user");
  assert.equal(locale.commands.flagNames.compliment.user, "user");
  assert.equal(locale.commands.flagNames.highfive.user, "user");
  assert.equal(locale.commands.flagNames.celebrate.reason, "reason");
  assert.equal(locale.commands.flagNames.kindness.theme, "theme");
  assert.equal(locale.commands.flagNames.quest.theme, "theme");
  assert.equal(locale.commands.flagNames.spark.theme, "theme");
});

test("readme lists every joy command", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  for (const command of joyCommands) {
    assert.match(readme, new RegExp(`\\\`${command}\\\``));
  }
});

test("joy commands load through the bot command handler", async () => {
  for (const command of ["misc", "random", "social", ...joyCommands]) {
    commands.delete(command);
    info.delete(command);
    paths.delete(command);
  }
  for (const command of [
    "misc affirm",
    "misc gratitude",
    "misc joy",
    "misc vibecheck",
    "misc die",
    "random dice",
    "social cheer",
    "social compliment",
    "social highfive",
    "random celebrate",
    "random kindness",
    "random quest",
    "random spark",
  ]) {
    info.delete(command);
    paths.delete(command);
  }
  for (const alias of [
    "affirmation",
    "die",
    "diceroll",
    "grateful",
    "joyguide",
    "vibes",
    "rally",
    "hype",
    "five",
    "party",
    "kind",
    "sidequest",
    "joyspark",
    "random",
  ]) {
    aliases.delete(alias);
  }

  assert.deepEqual(
    await Promise.all([
      load(null, resolve("commands/fun/misc.js"), true),
      load(null, resolve("commands/fun/random.js"), true),
      load(null, resolve("commands/fun/social.js"), true),
    ]),
    ["misc", "random", "social"],
  );

  assert.ok(commands.get("misc")?.affirm);
  assert.ok(commands.get("misc")?.gratitude);
  assert.ok(commands.get("misc")?.joy);
  assert.ok(commands.get("misc")?.vibecheck);
  assert.ok(commands.get("misc")?.die);
  assert.ok(commands.get("random")?.dice);
  assert.ok(commands.get("social")?.cheer);
  assert.ok(commands.get("social")?.compliment);
  assert.ok(commands.get("social")?.highfive);
  assert.ok(commands.get("random")?.celebrate);
  assert.ok(commands.get("random")?.kindness);
  assert.ok(commands.get("random")?.quest);
  assert.ok(commands.get("random")?.spark);

  assert.equal(info.get("misc")?.baseCommand, true);
  assert.equal(info.get("random")?.baseCommand, true);
  assert.equal(info.get("social")?.baseCommand, true);
  assert.equal(info.get("misc affirm")?.slashAllowed, true);
  assert.equal(info.get("misc gratitude")?.slashAllowed, true);
  assert.equal(info.get("misc joy")?.slashAllowed, true);
  assert.equal(info.get("misc vibecheck")?.slashAllowed, true);
  assert.equal(info.get("misc die")?.slashAllowed, true);
  assert.equal(info.get("random dice")?.slashAllowed, true);
  assert.equal(info.get("social cheer")?.slashAllowed, true);
  assert.equal(info.get("social compliment")?.slashAllowed, true);
  assert.equal(info.get("social highfive")?.slashAllowed, true);
  assert.equal(info.get("random celebrate")?.slashAllowed, true);
  assert.equal(info.get("random kindness")?.slashAllowed, true);
  assert.equal(info.get("random quest")?.slashAllowed, true);
  assert.equal(info.get("random spark")?.slashAllowed, true);

  assert.equal(aliases.get("affirmation"), "misc affirm");
  assert.equal(aliases.get("die"), "misc die");
  assert.equal(aliases.get("diceroll"), "random dice");
  assert.equal(aliases.get("grateful"), "misc gratitude");
  assert.equal(aliases.get("joyguide"), "misc joy");
  assert.equal(aliases.get("vibes"), "misc vibecheck");
  assert.equal(aliases.get("rally"), "social cheer");
  assert.equal(aliases.get("hype"), "social compliment");
  assert.equal(aliases.get("five"), "social highfive");
  assert.equal(aliases.get("party"), "random celebrate");
  assert.equal(aliases.get("kind"), "random kindness");
  assert.equal(aliases.get("sidequest"), "random quest");
  assert.equal(aliases.get("joyspark"), "random spark");
  assert.equal(aliases.has("random"), false);

  const payload = update().main;
  const optionNames = (name) => payload.find((command) => command.name === name)?.options?.map((option) => option.name);

  assert.ok(optionNames("misc")?.includes("affirm"));
  assert.ok(optionNames("misc")?.includes("gratitude"));
  assert.ok(optionNames("misc")?.includes("joy"));
  assert.ok(optionNames("misc")?.includes("vibecheck"));
  assert.ok(optionNames("random")?.includes("celebrate"));
  assert.ok(optionNames("random")?.includes("kindness"));
  assert.ok(optionNames("random")?.includes("quest"));
  assert.ok(optionNames("random")?.includes("spark"));
  assert.ok(optionNames("social")?.includes("cheer"));
  assert.ok(optionNames("social")?.includes("compliment"));
  assert.ok(optionNames("social")?.includes("highfive"));
});
