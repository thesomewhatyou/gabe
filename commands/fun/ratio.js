// Get rekt loser

import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class RatioCommand extends Command {
  static successMessages = [
    "RATIO SUCCESSFUL! +1 Internet Points",
    "CRITICAL HIT! The ratio was devastating!",
    "RATIO COMPLETE! They never saw it coming!",
    "ABSOLUTELY RATIOED! Get dunked on!",
    "RATIO VICTORY! The crowd goes wild!",
    "MEGA RATIO! That was brutal!",
    "RATIO ACHIEVED! Another one bites the dust!",
  ];

  static failMessages = [
    "RATIO FAILED! You got counter-ratioed!",
    "MISS! The ratio attempt was unsuccessful!",
    "RATIO DENIED! Better luck next time!",
    "FAILURE! You have been counter-ratioed!",
    "BLOCKED! The ratio didn't land!",
    "BACKFIRE! You ratioed yourself somehow!",
    "EMBARRASSING! The ratio attempt flopped!",
  ];

  static mildMessages = [
    "Weak ratio. Could've done better.",
    "Barely a ratio. Meh.",
    "Is that even a ratio? Questionable.",
    "Soft ratio. Not impressed.",
    "Mid ratio at best.",
  ];

  async run() {
    const user = this.getOptionUser("target");
    const target = user ?? this.author;

    if (target.id === this.client.user.id) {
      return "Nice try, but you can't ratio a bot. I actually touch grass, you incel.";
    }

    const isAuthor = target.id === this.author.id;
    const subject = isAuthor ? "yourself" : `<@${target.id}>`;

    // Calculate ratio success based on "random" chance
    const successChance = Math.random() * 100;

    // Legendary ratio (1% chance)
    if (successChance >= 99) {
      return `✨ **LEGENDARY RATIO UNLOCKED**
🎯 Target: ${subject}
💥 Result: ULTRA MEGA SUPER RATIO
📊 Ratio Power: OVER 9000
🏆 Achievement Unlocked: "Ratio Master"

*This is the most powerful ratio I've ever witnessed.*`;
    }

    // Success (50% chance)
    if (successChance >= 50) {
      const message = random(RatioCommand.successMessages);
      const ratioPower = Math.floor(Math.random() * 51) + 50; // 50-100

      return `🎯 **Ratio Attempt**
Target: ${subject}
Result: ${message}
📊 Ratio Power: ${ratioPower}/100`;
    }

    // Mild success (30% chance)
    if (successChance >= 20) {
      const message = random(RatioCommand.mildMessages);
      const ratioPower = Math.floor(Math.random() * 30) + 20; // 20-50

      return `🎯 **Ratio Attempt**
Target: ${subject}
Result: ${message}
📊 Ratio Power: ${ratioPower}/100`;
    }

    // Failure (20% chance)
    const message = random(RatioCommand.failMessages);
    const ratioPower = Math.floor(Math.random() * 20); // 0-20

    // Extra humiliation for self-ratio fails
    if (isAuthor) {
      return `🎯 **Ratio Attempt**
Target: ${subject}
Result: ${message}
📊 Ratio Power: ${ratioPower}/100

*WOW. You failed yourself. https://c.tenor.com/5lGj7oewq4EAAAAd/tenor.gif`;
      // Pathetic. How do you even manage that?
    }

    return `🎯 **Ratio Attempt**
Target: ${subject}
Result: ${message}
📊 Ratio Power: ${ratioPower}/100`;
  }

  static flags = [
    {
      name: "target",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who to attempt to ratio (defaults to you)",
      classic: true,
    },
  ];

  static description = "Gabe's Twitter Simulator (Patent Pending)";
  static aliases = ["ratioed", "getratioed", "cancel"];
}

export default RatioCommand;
