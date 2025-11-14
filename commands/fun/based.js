import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BasedCommand extends Command {
  async run() {
    const target = this.getOptionUser("user");

    // Random based level
    const basedLevel = Math.floor(Math.random() * 100) + 1;

    let rating = "";
    let color = 0x00ff00;
    let emoji = "✅";

    if (basedLevel >= 90) {
      rating = "UNBELIEVABLY BASED";
      color = 0x00ff00;
      emoji = "💎";
    } else if (basedLevel >= 75) {
      rating = "EXTREMELY BASED";
      color = 0x00cc00;
      emoji = "🔥";
    } else if (basedLevel >= 50) {
      rating = "PRETTY BASED";
      color = 0xffaa00;
      emoji = "👍";
    } else if (basedLevel >= 25) {
      rating = "SLIGHTLY CRINGE";
      color = 0xff6600;
      emoji = "😬";
    } else {
      rating = "MAXIMUM CRINGE";
      color = 0xff0000;
      emoji = "💀";
    }

    const progressBar = "█".repeat(Math.floor(basedLevel / 5)) + "░".repeat(20 - Math.floor(basedLevel / 5));

    if (target) {
      return {
        embeds: [
          {
            title: `${emoji} BASED METER ${emoji}`,
            description: `**Analyzing:** ${target.mention}`,
            fields: [
              {
                name: "Rating",
                value: rating,
                inline: false,
              },
              {
                name: "Based Level",
                value: `\`${progressBar}\` **${basedLevel}%**`,
                inline: false,
              },
            ],
            color: color,
            footer: {
              text: basedLevel >= 50 ? "Certified Based" : "Certified Cringe",
            },
          },
        ],
      };
    }

    return {
      embeds: [
        {
          title: `${emoji} BASED METER ${emoji}`,
          fields: [
            {
              name: "Rating",
              value: rating,
              inline: false,
            },
            {
              name: "Based Level",
              value: `\`${progressBar}\` **${basedLevel}%**`,
              inline: false,
            },
          ],
          color: color,
          footer: {
            text: basedLevel >= 50 ? "Certified Based" : "Certified Cringe",
          },
        ],
      ],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Check how based someone is",
      required: false,
    },
  ];

  static description = "Measure how based someone is";
  static aliases = ["cringe", "basedmeter", "basedratio"];
}

export default BasedCommand;
