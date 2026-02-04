import Command from "#cmd-classes/command.js";

class DailyCommand extends Command {
  static dailyMessages = [
    "Gabe blessed you with",
    "You found",
    "The economy gods grant you",
    "A wild GabeCoin appeared! You caught",
    "Your daily salary is",
    "The Federal Reserve of Gabe printed",
  ];

  async run() {
    if (!this.guild) {
      this.success = false;
      return "This command can only be used in servers.";
    }

    if (!this.database) {
      this.success = false;
      return "Database is not available.";
    }

    const enabled = await this.database.isEconomyEnabled(this.guild.id);
    if (!enabled) {
      this.success = false;
      return "💰 The economy system is not enabled in this server.";
    }

    const userId = this.author?.id;
    if (!userId) {
      this.success = false;
      return "Could not identify user.";
    }

    const settings = await this.database.getEconomySettings(this.guild.id);
    const userData = await this.database.getEconomyUser(this.guild.id, userId);

    // Check cooldown
    if (userData.last_daily) {
      const lastDaily = new Date(userData.last_daily);
      const now = new Date();
      const timeSince = now.getTime() - lastDaily.getTime();
      const cooldownMs = settings.daily_cooldown * 1000;

      if (timeSince < cooldownMs) {
        const remaining = cooldownMs - timeSince;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        this.success = false;
        return `⏰ You've already claimed your daily! Come back in **${hours}h ${minutes}m**.`;
      }
    }

    // Grant daily reward
    const amount = settings.daily_amount;
    const newBalance = await this.database.addBalance(this.guild.id, userId, amount);
    await this.database.setLastDaily(this.guild.id, userId);
    await this.database.logTransaction(this.guild.id, userId, "daily", amount, undefined, "Daily reward");

    const message = DailyCommand.dailyMessages[Math.floor(Math.random() * DailyCommand.dailyMessages.length)];

    return {
      embeds: [
        {
          title: "💰 Daily Reward!",
          description: `${message} **${amount.toLocaleString()}** 🪙 GabeCoins!`,
          color: 0x00ff00,
          fields: [
            {
              name: "New Balance",
              value: `**${newBalance.toLocaleString()}** 🪙`,
              inline: true,
            },
          ],
          footer: {
            text: "Come back tomorrow for more!",
          },
        },
      ],
    };
  }

  static description = "Claim your daily GabeCoins";
  static aliases = [];
  static dbRequired = true;
}

export default DailyCommand;
