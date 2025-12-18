import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class RemoveXPCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "This command can only be used in servers.";
    }

    if (!this.database) {
      this.success = false;
      return "Database is not available.";
    }

    // Check if user has administrator permission
    if (!this.member || !this.member.permissions.has("ADMINISTRATOR")) {
      this.success = false;
      return "❌ You need the **Administrator** permission to manage the leveling system.";
    }

    // Get parameters
    let userId = this.options.user;
    let amount = this.options.amount;

    // For classic commands, parse from args
    if (!userId && this.message) {
      if (this.message.mentions.length === 0) {
        this.success = false;
        return "❌ Please mention a user to remove XP from.";
      }
      userId = this.message.mentions[0].id;
      amount = parseInt(this.args[0]);
    }

    if (!amount || isNaN(amount)) {
      this.success = false;
      return "❌ Please provide a valid amount of XP to remove.";
    }

    if (amount <= 0) {
      this.success = false;
      return "❌ Amount must be greater than 0.";
    }

    // Get current XP
    const userLevel = await this.database.getUserLevel(this.guild.id, userId);
    const newXP = Math.max(0, userLevel.xp - amount);
    const actualRemoved = userLevel.xp - newXP;

    // Remove XP by adding negative amount
    const result = await this.database.addXP(this.guild.id, userId, -actualRemoved);

    return `✅ Removed **${actualRemoved.toLocaleString()} XP** from <@${userId}>. They now have **${result.xp.toLocaleString()} XP** and are level **${result.level}**.`;
  }

  static description = "Remove XP from a user";
  static aliases = [];
  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to remove XP from",
      required: true,
    },
    {
      name: "amount",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Amount of XP to remove",
      required: true,
      minValue: 1,
    },
  ];
  static dbRequired = true;
}

export default RemoveXPCommand;
