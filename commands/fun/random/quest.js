import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanJoyInput, currentDayKey, seededIndex, seededPick } from "#utils/joy.js";

class QuestCommand extends Command {
  static quests = [
    { title: "kindness speedrun", task: "send one honest compliment to someone who deserves it" },
    { title: "hydration arc", task: "drink water before opening three more tabs" },
    { title: "tiny cleanup", task: "fix one small thing you have been ignoring" },
    { title: "playlist magic", task: "queue a song that makes the room feel lighter" },
    { title: "brave little ping", task: "ask the question you have been avoiding" },
    { title: "fresh air patch", task: "step away from the screen for two minutes" },
    { title: "gratitude loot", task: "name one thing that did not go wrong today" },
    { title: "micro victory", task: "finish something so small it feels silly counting it" },
  ];

  static rewards = [
    "+5 joy",
    "+2 mysterious confidence",
    "+1 imaginary sticker",
    "+8 friendship aura",
    "+3 focus sparkle",
    "+1 gabe approval stamp",
  ];

  static difficulties = ["easy", "cozy", "medium", "spicy", "heroic but tiny"];

  static description = "Get a tiny happy side quest from Gabe";
  static aliases = ["sidequest", "dailyquest", "mission", "task"];

  static flags = [
    {
      name: "theme",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Optional quest theme",
      classic: true,
    },
  ];

  static cleanTheme(input) {
    return cleanJoyInput(input, 80);
  }

  static index(seed, length) {
    return seededIndex(seed, length, "quest");
  }

  static pick(seed, list) {
    return seededPick(seed, list, "quest");
  }

  static build(seed, theme) {
    const quest = QuestCommand.pick(`${seed}:quest:${theme ?? ""}`, QuestCommand.quests);
    return {
      ...quest,
      difficulty: QuestCommand.pick(`${seed}:difficulty`, QuestCommand.difficulties),
      reward: QuestCommand.pick(`${seed}:reward`, QuestCommand.rewards),
      theme,
    };
  }

  async run() {
    const optionTheme = this.getOptionString("theme");
    const fallbackTheme = this.args?.length ? this.args.join(" ") : undefined;
    const theme = QuestCommand.cleanTheme(optionTheme ?? fallbackTheme);
    const dayKey = currentDayKey();
    const quest = QuestCommand.build(`${this.author.id}:${dayKey}`, theme);

    return [
      "**gabe side quest**",
      `quest: ${quest.title}`,
      theme ? `theme: ${theme}` : undefined,
      `difficulty: ${quest.difficulty}`,
      `task: ${quest.task}`,
      `reward: ${quest.reward}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
}

export default QuestCommand;
