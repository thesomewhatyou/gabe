import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class FakeBanCommand extends Command {
  async run() {
    const target = this.getOptionUser("user", true);

    if (!target) {
      this.success = false;
      return "❌ Gabe says: You gotta tell me who to fake ban, genius.";
    }

    if (target.id === this.client.user.id) {
      return "🤖 Nice try, but I'm immune to fake bans. I'm built different.";
    }

    const reasons = [
      "Being too cringe",
      "Existing",
      "Skill issue",
      "Didn't touch grass",
      "Ratio'd too hard",
      "No bitches",
      "Caught being unfunny",
      "Too many L's",
      "Chronic Discord usage",
      "Main character syndrome",
      "Unverified vibes",
      "Being sus",
      "Posting memes from 2012",
      "Your mom",
    ];

    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    // Dramatic fake ban sequence
    const messages = [
      `⚠️ **INITIATING BAN SEQUENCE...**`,
      `🔍 Scanning ${target.mention} for violations...`,
      `📋 Violation found: **${reason}**`,
      `⚖️ Judgment: **GUILTY**`,
      `🔨 **BANNING ${target.tag}...**`,
      ``,
      ``,
      ``,
      `Just kidding lmao. You're fine. **For now.**`,
    ];

    // Return the full sequence
    return {
      embeds: [
        {
          title: "🚨 BAN HAMMER ACTIVATED 🚨",
          description: messages.join("\n"),
          color: 0xff0000,
          footer: {
            text: "Gabe's Fake Ban System™ - Not liable for emotional damage",
          },
          thumbnail: {
            url: target.avatarURL("png", 256),
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to fake ban",
      required: true,
    },
  ];

  static description = "Pretend to ban someone with dramatic effects (it's fake, relax)";
  static aliases = ["pretendban", "jokeban"];
}

export default FakeBanCommand;
