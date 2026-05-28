import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanJoyInput, currentDayKey, seededPick } from "#utils/joy.js";

class KindnessCommand extends Command {
  static prompts = [
    "send a real compliment with no joke attached",
    "thank someone for a thing they probably think went unnoticed",
    "make one small thing easier for the next person",
    "check on a friend with a low pressure message",
    "share something useful without making it a whole performance",
    "forgive one tiny mistake before it grows dramatic shoes",
    "leave a nice comment where someone can find it later",
    "give someone the benefit of the doubt for one full minute",
  ];

  static recipients = [
    "a friend",
    "future you",
    "someone quiet in chat",
    "the person who keeps trying",
    "a teammate",
    "a stranger nearby",
    "the next person who posts",
    "whoever needs a softer landing today",
  ];

  static rewards = [
    "+4 warm room energy",
    "+2 friendship sparkle",
    "+1 tiny peace treaty",
    "+3 invisible good points",
    "+5 morale crumbs",
    "+1 secret gabe sticker",
  ];

  static closers = [
    "small kindness still counts",
    "gabe says this is how the room gets brighter",
    "do it tiny do it real",
    "good deed speedrun ready",
    "warmth deployed correctly",
  ];

  static description = "Get a tiny Gabe kindness mission";
  static aliases = ["kind", "kindquest", "goodturn", "nicequest"];

  static flags = [
    {
      name: "theme",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Optional kindness theme",
      classic: true,
    },
  ];

  static cleanTheme(input) {
    return cleanJoyInput(input, 80);
  }

  static pick(seed, list) {
    return seededPick(seed, list, "kindness");
  }

  static build(seed, theme) {
    const themeSeed = theme ?? "today";
    return {
      theme,
      prompt: KindnessCommand.pick(`${seed}:prompt:${themeSeed}`, KindnessCommand.prompts),
      recipient: KindnessCommand.pick(`${seed}:recipient:${themeSeed}`, KindnessCommand.recipients),
      reward: KindnessCommand.pick(`${seed}:reward:${themeSeed}`, KindnessCommand.rewards),
      closer: KindnessCommand.pick(`${seed}:closer:${themeSeed}`, KindnessCommand.closers),
    };
  }

  async run() {
    const optionTheme = this.getOptionString("theme");
    const fallbackTheme = this.args?.length ? this.args.join(" ") : undefined;
    const theme = KindnessCommand.cleanTheme(optionTheme ?? fallbackTheme);
    const mission = KindnessCommand.build(`${this.author.id}:${currentDayKey()}`, theme);

    return [
      "**gabe kindness mission**",
      theme ? `theme: ${theme}` : undefined,
      `for: ${mission.recipient}`,
      `mission: ${mission.prompt}`,
      `reward: ${mission.reward}`,
      mission.closer,
    ]
      .filter(Boolean)
      .join("\n");
  }
}

export default KindnessCommand;
