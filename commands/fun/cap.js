import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CapCommand extends Command {
  async run() {
    const target = this.getOptionUser("user");

    // Random cap level
    const capLevel = Math.floor(Math.random() * 100) + 1;

    let rating = "";
    let color = 0xff0000;

    if (capLevel >= 90) {
      rating = "🧢 MAXIMUM CAP DETECTED 🧢";
      color = 0xff0000;
    } else if (capLevel >= 75) {
      rating = "🧢 HEAVY CAP 🧢";
      color = 0xff4400;
    } else if (capLevel >= 50) {
      rating = "🧢 Some Cap 🧢";
      color = 0xffaa00;
    } else if (capLevel >= 25) {
      rating = "🚫🧢 Mostly No Cap";
      color = 0x00cc00;
    } else {
      rating = "💯 NO CAP FR FR 💯";
      color = 0x00ff00;
    }

    const progressBar = "█".repeat(Math.floor(capLevel / 5)) + "░".repeat(20 - Math.floor(capLevel / 5));

    const content = target ? `**Analyzing:** ${target.mention}` : "**Cap Detector Active**";

    return {
      embeds: [
        {
          title: "🧢 CAP DETECTOR 3000 🧢",
          description: content,
          fields: [
            {
              name: "Analysis Result",
              value: rating,
              inline: false,
            },
            {
              name: "Cap Level",
              value: `\`${progressBar}\` **${capLevel}%**`,
              inline: false,
            },
          ],
          color: color,
          footer: {
            text: capLevel >= 50 ? "Verdict: Cap detected fr fr" : "Verdict: No cap on a stack",
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Detect cap levels",
      required: false,
    },
  ];

  static description = "Detect cap (lies) fr fr no cap";
  static aliases = ["nocap", "lying", "lie"];
}

export default CapCommand;
