import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanJoyInput, currentDayKey, seededPick } from "#utils/joy.js";

class JoyCommand extends Command {
  static moods = [
    {
      key: "boost",
      label: "need a boost",
      commands: ["affirm", "spark", "vibecheck"],
      plan: "get a kind line, grab one tiny action, then check the vibe meter",
    },
    {
      key: "friend",
      label: "hype a friend",
      commands: ["compliment", "cheer", "highfive"],
      plan: "send warmth, rally the chat, then add a high five",
    },
    {
      key: "task",
      label: "start moving",
      commands: ["quest", "spark", "gratitude"],
      plan: "pick a side quest, take one spark step, then name one good thing",
    },
    {
      key: "party",
      label: "make chat brighter",
      commands: ["celebrate", "cheer", "annoy"],
      plan: "start the party, rally the room, then add harmless nonsense",
    },
    {
      key: "kindness",
      label: "do a good thing",
      commands: ["kindness", "gratitude", "spark"],
      plan: "pick one kind mission, notice one good thing, then carry the spark forward",
    },
  ];

  static closers = [
    "gabe recommends starting small and counting it anyway",
    "joy department says this is actionable",
    "tiny morale engine online",
    "good vibes are now organized enough to use",
    "this plan has been approved by extremely unserious science",
  ];

  static description = "Get Gabe's guide to the happy fun commands";
  static aliases = ["joyguide", "happy", "morale", "goodvibes"];

  static flags = [
    {
      name: "need",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "What kind of joy do you need?",
      choices: [
        { name: "Need a boost", value: "boost" },
        { name: "Hype a friend", value: "friend" },
        { name: "Start moving", value: "task" },
        { name: "Make chat brighter", value: "party" },
      ],
      classic: true,
    },
  ];

  static cleanNeed(input) {
    return cleanJoyInput(input, 40)?.toLowerCase();
  }

  static pick(seed, list) {
    return seededPick(seed, list, "joy");
  }

  static resolveMood(seed, need) {
    const cleanedNeed = JoyCommand.cleanNeed(need);
    const exact = JoyCommand.moods.find((mood) => mood.key === cleanedNeed);
    if (exact) return exact;

    const fuzzy = JoyCommand.moods.find(
      (mood) => cleanedNeed && (mood.label.includes(cleanedNeed) || mood.commands.includes(cleanedNeed)),
    );
    return fuzzy ?? JoyCommand.pick(seed, JoyCommand.moods);
  }

  static build(seed, need) {
    const mood = JoyCommand.resolveMood(seed, need);
    return {
      ...mood,
      closer: JoyCommand.pick(`${seed}:${mood.key}:closer`, JoyCommand.closers),
    };
  }

  async run() {
    const optionNeed = this.getOptionString("need");
    const fallbackNeed = this.args?.length ? this.args.join(" ") : undefined;
    const guide = JoyCommand.build(`${this.author.id}:${currentDayKey()}`, optionNeed ?? fallbackNeed);

    return [
      "**gabe joy guide**",
      `mode: ${guide.label}`,
      `try: ${guide.commands.map((command) => `\`${command}\``).join(" -> ")}`,
      `plan: ${guide.plan}`,
      guide.closer,
    ].join("\n");
  }
}

export default JoyCommand;
