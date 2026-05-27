import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CelebrateCommand extends Command {
  static reasons = [
    "surviving the day",
    "being weird in a productive direction",
    "making chat slightly brighter",
    "finishing a tiny quest",
    "showing up anyway",
    "having excellent timing",
    "being a certified moment",
  ];

  static confetti = ["*", "+", "x", "o", "#", "~"];

  static lines = [
    "gabe has declared a small but official celebration",
    "the vibes committee has approved this moment",
    "tiny parade mode enabled",
    "joy has entered the chat with admin confidence",
    "this achievement deserves at least three imaginary balloons",
  ];

  static description = "Start a tiny Gabe celebration for anything worth cheering";
  static aliases = ["party", "yay", "woo", "hypeparty"];

  static flags = [
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "What are we celebrating? (defaults to pure vibes)",
      classic: true,
    },
  ];

  static cleanReason(input) {
    if (!input || typeof input !== "string") return undefined;
    const trimmed = input.trim().replace(/\s+/g, " ");
    if (!trimmed) return undefined;
    return trimmed.length > 100 ? `${trimmed.slice(0, 97)}...` : trimmed;
  }

  static pick(seed, list) {
    let hash = 31;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 41 + seed.charCodeAt(i)) % 1000003;
    }
    return list[hash % list.length];
  }

  static makeConfetti(seed) {
    const pieces = [];
    for (let i = 0; i < 18; i += 1) {
      pieces.push(CelebrateCommand.pick(`${seed}:${i}`, CelebrateCommand.confetti));
    }
    return pieces.join(" ");
  }

  async run() {
    const optionReason = this.getOptionString("reason");
    const fallbackReason = this.args?.length ? this.args.join(" ") : undefined;
    const reason =
      CelebrateCommand.cleanReason(optionReason ?? fallbackReason) ??
      CelebrateCommand.pick(this.author.id, CelebrateCommand.reasons);
    const seed = `${this.author.id}:${reason}`;

    return [
      "**gabe celebration protocol**",
      CelebrateCommand.makeConfetti(seed),
      `celebrating: ${reason}`,
      CelebrateCommand.pick(`${seed}:line`, CelebrateCommand.lines),
      "mandatory task: smile at least 2 percent",
    ].join("\n");
  }
}

export default CelebrateCommand;
