import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { currentDayKey, seededPick } from "#utils/joy.js";
import { mentionToObject } from "#utils/mentions.js";

class AffirmCommand extends Command {
  static affirmations = [
    "you are allowed to be proud of small progress",
    "you have handled hard days before and you are still here",
    "your ideas deserve room to breathe",
    "you can be unfinished and still be doing well",
    "you bring more value than your current energy level shows",
    "you are not behind in a race nobody explained",
    "your kindness counts even when it feels quiet",
    "you can take the next step without solving the whole map",
  ];

  static closers = [
    "gabe believes this with alarming confidence",
    "take that and keep moving",
    "tiny win unlocked",
    "save this for later if today gets loud",
    "no debate from the vibes department",
  ];

  static description = "Get a warm Gabe affirmation";
  static aliases = ["affirmation", "encourage", "pep", "uplift"];

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who should Gabe affirm? (defaults to you)",
      classic: true,
    },
  ];

  static pick(seed, list) {
    return seededPick(seed, list, "affirm");
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
    const seed = `${target.id}:${dayKey}`;

    return [
      `**gabe affirmation for <@${target.id}>**`,
      AffirmCommand.pick(seed, AffirmCommand.affirmations),
      AffirmCommand.pick(`${seed}:closer`, AffirmCommand.closers),
    ].join("\n");
  }
}

export default AffirmCommand;
