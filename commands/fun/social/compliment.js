import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { currentDayKey, seededPick } from "#utils/joy.js";
import { mentionToObject } from "#utils/mentions.js";

class ComplimentCommand extends Command {
  static compliments = [
    "has elite side quest energy",
    "makes the room feel easier to be in",
    "is quietly carrying the good vibes department",
    "has a brain full of useful sparks",
    "brings premium silly little legend energy",
    "is doing better than they think",
    "has immaculate comeback arc potential",
    "makes chaos look friendly",
    "is certified delightful by gabe labs",
    "has main character warmth without the annoying trailer",
  ];

  static extras = [
    "gabe stamped this with approval",
    "no notes from gabe",
    "chat should clap politely",
    "this is science probably",
    "keep going it suits you",
  ];

  static description = "Let Gabe send someone a warm ridiculous compliment";
  static aliases = ["hype", "boost", "cheer", "nice"];

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who should Gabe compliment? (defaults to you)",
      classic: true,
    },
  ];

  static pick(seed, list) {
    return seededPick(seed, list, "compliment");
  }

  async resolveClassicUser() {
    const raw = typeof this.options?.user === "string" ? this.options.user : this.args?.[0];
    if (!raw) return undefined;

    return mentionToObject(this.client, raw, "user", {
      guild: this.guild ?? undefined,
    })
      .then((entity) => entity?.user ?? entity)
      .catch(() => undefined);
  }

  async run() {
    const target = this.getOptionUser("user") ?? (await this.resolveClassicUser()) ?? this.author;
    const dayKey = currentDayKey();
    const seed = `${target.id}:${this.author.id}:${dayKey}`;
    const compliment = ComplimentCommand.pick(seed, ComplimentCommand.compliments);
    const extra = ComplimentCommand.pick(`${seed}:extra`, ComplimentCommand.extras);

    return `<@${target.id}> ${compliment}\n${extra}`;
  }
}

export default ComplimentCommand;
