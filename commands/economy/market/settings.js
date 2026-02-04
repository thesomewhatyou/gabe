import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class SettingsCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "This command can only be used in servers.";
    }

    if (!this.database) {
      this.success = false;
      return "Database is not available.";
    }

    // Check if user is bot owner or server admin
    const isBotOwner = isOwner(this.author?.id);
    const isServerAdmin = this.member?.permissions?.has("ADMINISTRATOR");

    if (!isBotOwner && !isServerAdmin) {
      this.success = false;
      return "🔒 You need to be a server administrator to manage the economy.";
    }

    const action = this.options.action ?? this.args?.[0];

    // If no action, show current settings
    if (!action || action === "view") {
      const settings = await this.database.getEconomySettings(this.guild.id);
      return {
        embeds: [
          {
            title: "⚙️ Economy Settings",
            color: 0x3498db,
            fields: [
              {
                name: "Status",
                value: settings.enabled ? "✅ Enabled" : "❌ Disabled",
                inline: true,
              },
              {
                name: "Daily Reward",
                value: `${settings.daily_amount.toLocaleString()} 🪙`,
                inline: true,
              },
              {
                name: "Work Earnings",
                value: `${settings.work_min}-${settings.work_max} 🪙`,
                inline: true,
              },
              {
                name: "Work Cooldown",
                value: `${Math.floor(settings.work_cooldown / 60)} minutes`,
                inline: true,
              },
              {
                name: "Daily Cooldown",
                value: `${Math.floor(settings.daily_cooldown / 3600)} hours`,
                inline: true,
              },
            ],
            footer: {
              text: "Use /market settings enable/disable to toggle the economy",
            },
          },
        ],
      };
    }

    if (action === "enable") {
      const settings = await this.database.getEconomySettings(this.guild.id);
      settings.enabled = true;
      await this.database.setEconomySettings(settings);
      return "✅ Economy system has been **enabled** for this server!";
    }

    if (action === "disable") {
      const settings = await this.database.getEconomySettings(this.guild.id);
      settings.enabled = false;
      await this.database.setEconomySettings(settings);
      return "❌ Economy system has been **disabled** for this server.";
    }

    if (action === "daily") {
      const value = this.options.value ?? parseInt(this.args?.[1]);
      if (!value || isNaN(value) || value < 1) {
        this.success = false;
        return "❌ Please provide a valid daily amount.";
      }
      const settings = await this.database.getEconomySettings(this.guild.id);
      settings.daily_amount = value;
      await this.database.setEconomySettings(settings);
      return `✅ Daily reward set to **${value.toLocaleString()}** 🪙!`;
    }

    return "❌ Unknown action. Use `view`, `enable`, `disable`, or `daily <amount>`.";
  }

  static flags = [
    {
      name: "action",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Action to perform",
      choices: [
        { name: "View Settings", value: "view" },
        { name: "Enable Economy", value: "enable" },
        { name: "Disable Economy", value: "disable" },
        { name: "Set Daily Amount", value: "daily" },
      ],
      required: false,
    },
    {
      name: "value",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Value for the action",
      required: false,
    },
  ];

  static description = "Configure economy settings";
  static aliases = ["config"];
  static adminOnly = true;
  static dbRequired = true;
}

export default SettingsCommand;
