import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { currentDayKey, resolveJoyUser, seededPick } from "#utils/joy.js";

class HighfiveCommand extends Command {
  static styles = [
    "perfectly timed high five",
    "sparkly high five",
    "maximum friendship high five",
    "victory lap high five",
    "tiny celebration high five",
    "legendary morale boost high five",
    "freshly charged high five",
    "teamwork certified high five",
  ];

  static effects = [
    "the room gets 12 percent brighter",
    "gabe awards one imaginary sticker",
    "a tiny win counter goes up",
    "the good vibes department files a glowing report",
    "momentum has entered the chat",
    "everyone nearby gains a little courage",
    "the next task looks slightly less scary",
    "confetti exists emotionally",
  ];

  static description = "Give someone a cheerful Gabe high five";
  static aliases = ["five", "uphigh", "high5", "nicefive"];

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who should get the high five? (defaults to you)",
      classic: true,
    },
  ];

  static pick(seed, list) {
    return seededPick(seed, list, "highfive");
  }

  static build(seed) {
    return {
      style: HighfiveCommand.pick(`${seed}:style`, HighfiveCommand.styles),
      effect: HighfiveCommand.pick(`${seed}:effect`, HighfiveCommand.effects),
    };
  }

  async resolveClassicUser() {
    return resolveJoyUser(this);
  }

  async run() {
    const target = this.getOptionUser("user") ?? (await this.resolveClassicUser()) ?? this.author;
    const dayKey = currentDayKey();
    const seed = `${this.author.id}:${target.id}:${dayKey}`;
    const highfive = HighfiveCommand.build(seed);
    const giver = target.id === this.author.id ? "gabe" : `<@${this.author.id}>`;

    return [`**${highfive.style}**`, `${giver} gives <@${target.id}> a high five`, highfive.effect].join("\n");
  }
}

export default HighfiveCommand;
