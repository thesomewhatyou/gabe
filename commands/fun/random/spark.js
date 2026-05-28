import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanJoyInput, currentDayKey, seededPick } from "#utils/joy.js";

class SparkCommand extends Command {
  static sparks = [
    "make the next thing easier than it was yesterday",
    "turn one tiny win into proof that momentum exists",
    "send a kind message before the thought wanders off",
    "rename the scary task into something smaller and sillier",
    "put one good song between you and the next hard thing",
    "take the smallest useful step and count it loudly",
    "let the imperfect version be the version that ships",
    "make something bright enough that future you notices",
  ];

  static actions = [
    "take one deep breath and start with the first obvious move",
    "set a five minute timer and win that tiny round",
    "write down the next step in plain words",
    "clear one square foot of chaos from your desk or brain",
    "send one honest thank you",
    "drink water and pretend it is a power-up",
    "close one tab that has been haunting you",
    "celebrate before the victory gets shy",
  ];

  static charms = [
    "fresh battery energy",
    "confetti in the code path",
    "main character focus",
    "small win magnetism",
    "clean hoodie confidence",
    "playlist-level courage",
    "sunbeam logic",
    "bonus round luck",
  ];

  static description = "Get a tiny spark of joy and momentum from Gabe";
  static aliases = ["sparkle", "sparkboost", "joyspark", "momentum"];

  static flags = [
    {
      name: "theme",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Optional spark theme",
      classic: true,
    },
  ];

  static cleanTheme(input) {
    return cleanJoyInput(input, 80);
  }

  static pick(seed, list) {
    return seededPick(seed, list, "spark");
  }

  static build(seed, theme) {
    const themeSeed = theme ?? "today";
    return {
      theme,
      spark: SparkCommand.pick(`${seed}:spark:${themeSeed}`, SparkCommand.sparks),
      action: SparkCommand.pick(`${seed}:action:${themeSeed}`, SparkCommand.actions),
      charm: SparkCommand.pick(`${seed}:charm:${themeSeed}`, SparkCommand.charms),
    };
  }

  async run() {
    const optionTheme = this.getOptionString("theme");
    const fallbackTheme = this.args?.length ? this.args.join(" ") : undefined;
    const theme = SparkCommand.cleanTheme(optionTheme ?? fallbackTheme);
    const spark = SparkCommand.build(`${this.author.id}:${currentDayKey()}`, theme);

    return [
      "**gabe joy spark**",
      theme ? `theme: ${theme}` : undefined,
      `spark: ${spark.spark}`,
      `tiny action: ${spark.action}`,
      `lucky charm: ${spark.charm}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
}

export default SparkCommand;
