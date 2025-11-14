import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class SkillIssueCommand extends Command {
  async run() {
    const target = this.getOptionUser("user");

    // Random skill issue severity
    const severity = Math.floor(Math.random() * 100) + 1;

    let rating = "";
    let color = 0xff0000;

    if (severity >= 90) {
      rating = "CATASTROPHIC SKILL ISSUE";
      color = 0x800000;
    } else if (severity >= 75) {
      rating = "SEVERE SKILL ISSUE";
      color = 0xff0000;
    } else if (severity >= 50) {
      rating = "MODERATE SKILL ISSUE";
      color = 0xff6600;
    } else if (severity >= 25) {
      rating = "MINOR SKILL ISSUE";
      color = 0xffaa00;
    } else {
      rating = "NEGLIGIBLE SKILL ISSUE";
      color = 0xffff00;
    }

    const progressBar = "█".repeat(Math.floor(severity / 5)) + "░".repeat(20 - Math.floor(severity / 5));

    if (target) {
      return {
        embeds: [
          {
            title: "⚠️ SKILL ISSUE DETECTED ⚠️",
            description: `**Target:** ${target.mention}`,
            fields: [
              {
                name: "Severity",
                value: rating,
                inline: false,
              },
              {
                name: "Skill Issue Level",
                value: `\`${progressBar}\` **${severity}%**`,
                inline: false,
              },
            ],
            color: color,
            footer: {
              text: "Diagnosis: Git gud",
            },
          },
        ],
      };
    }

    return {
      embeds: [
        {
          title: "⚠️ SKILL ISSUE DETECTED ⚠️",
          fields: [
            {
              name: "Severity",
              value: rating,
              inline: false,
            },
            {
              name: "Skill Issue Level",
              value: `\`${progressBar}\` **${severity}%**`,
              inline: false,
            },
          ],
          color: color,
          footer: {
            text: "Diagnosis: Git gud",
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Diagnose someone's skill issue",
      required: false,
    },
  ];

  static description = "Diagnose and rate a skill issue";
  static aliases = ["gitgud", "issue", "unskilled"];
}

export default SkillIssueCommand;
