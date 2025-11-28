import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { locales } from "#utils/collections.js";

class PreferencesCommand extends Command {
  async run() {
    if (!this.database) {
      this.success = false;
      return "❌ Database is not configured. Preferences cannot be saved.";
    }

    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return "❌ I need permission to embed links!";
    }

    const subcommand = this.interaction
      ? this.interaction.data.options.getSubCommand()?.[0]
      : this.args[0]?.toLowerCase();

    if (!subcommand || subcommand === "view") {
      return this.viewPreferences();
    }

    if (subcommand === "language" || subcommand === "locale") {
      const locale = this.getOptionString("locale") ?? this.args[1];
      return this.setLanguage(locale);
    }

    if (subcommand === "notifications" || subcommand === "dms") {
      const enabled = this.getOptionBoolean("enabled") ?? this.args[1];
      return this.setNotifications(enabled);
    }

    return this.viewPreferences();
  }

  async viewPreferences() {
    const prefs = await this.database.getUserPreferences(this.author.id);

    const availableLocales = [...locales.keys()].slice(0, 20).join(", ");

    return {
      embeds: [{
        color: 0x5865f2,
        title: "⚙️ Your Preferences",
        description: "Use the subcommands to change your preferences.",
        fields: [
          {
            name: "🌐 Language",
            value: prefs.locale ?? "Not set (using server/default)",
            inline: true,
          },
          {
            name: "📬 DM Notifications",
            value: prefs.dm_notifications ? "Enabled" : "Disabled",
            inline: true,
          },
          {
            name: "📝 Available Languages",
            value: `\`${availableLocales}\`${locales.size > 20 ? ` +${locales.size - 20} more` : ""}`,
            inline: false,
          },
        ],
        footer: {
          text: "Use /preferences language <locale> or /preferences notifications <on/off>",
        },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  async setLanguage(locale) {
    if (!locale) {
      this.success = false;
      return "❌ Please specify a language code (e.g., `en-US`, `es-ES`, `fr`).";
    }

    const normalizedLocale = locale.toLowerCase() === "reset" || locale.toLowerCase() === "none" ? null : locale;

    if (normalizedLocale && !locales.has(normalizedLocale)) {
      const availableLocales = [...locales.keys()].slice(0, 15).join(", ");
      this.success = false;
      return `❌ Unknown language: \`${locale}\`\n\nAvailable: \`${availableLocales}\`${locales.size > 15 ? ` +${locales.size - 15} more` : ""}`;
    }

    await this.database.setUserPreference(this.author.id, "locale", normalizedLocale);

    if (normalizedLocale) {
      return `✅ Your language preference has been set to \`${normalizedLocale}\`.`;
    } else {
      return "✅ Your language preference has been reset to use the server/default language.";
    }
  }

  async setNotifications(enabled) {
    let value;

    if (typeof enabled === "boolean") {
      value = enabled;
    } else if (typeof enabled === "string") {
      const lower = enabled.toLowerCase();
      if (["on", "true", "yes", "enable", "enabled", "1"].includes(lower)) {
        value = true;
      } else if (["off", "false", "no", "disable", "disabled", "0"].includes(lower)) {
        value = false;
      } else {
        this.success = false;
        return "❌ Please specify `on` or `off` for notifications.";
      }
    } else {
      this.success = false;
      return "❌ Please specify `on` or `off` for notifications.";
    }

    await this.database.setUserPreference(this.author.id, "dm_notifications", value);

    return `✅ DM notifications have been ${value ? "**enabled**" : "**disabled**"}.\n${value ? "You will receive DMs for moderation actions." : "You will no longer receive DMs for moderation actions."}`;
  }

  static flags = [
    {
      name: "view",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "View your current preferences",
    },
    {
      name: "language",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "Set your preferred language",
      options: [
        {
          name: "locale",
          type: Constants.ApplicationCommandOptionTypes.STRING,
          description: "Language code (e.g., en-US, es-ES, fr) or 'reset' to clear",
          required: true,
        },
      ],
    },
    {
      name: "notifications",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "Toggle DM notifications for moderation actions",
      options: [
        {
          name: "enabled",
          type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
          description: "Enable or disable DM notifications",
          required: true,
        },
      ],
    },
  ];

  static description = "Manage your personal bot preferences";
  static aliases = ["prefs", "settings", "mysettings"];
}

export default PreferencesCommand;
