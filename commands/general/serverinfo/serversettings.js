import process from "node:process";
import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class ServerSettingsCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "❌ This command can only be used in a server!";
    }

    if (!this.database) {
      this.success = false;
      return "❌ Database is not configured. Settings cannot be managed.";
    }

    // Permission check
    if (!this.memberPermissions.has("ADMINISTRATOR") && !isOwner(this.author?.id)) {
      this.success = false;
      return "❌ You need Administrator permission to manage server settings.";
    }

    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return "❌ I need permission to embed links!";
    }

    const subcommand = this.interaction
      ? this.interaction.data.options.getSubCommand()?.[0]
      : this.args[0]?.toLowerCase();

    if (!subcommand || subcommand === "view") {
      return this.viewSettings();
    }

    if (subcommand === "prefix") {
      const prefix = this.getOptionString("prefix") ?? this.args[1];
      return this.setPrefix(prefix);
    }

    return this.viewSettings();
  }

  async viewSettings() {
    const guildSettings = await this.database.getGuild(this.guild.id);

    const disabledCommandsDisplay = guildSettings.disabled_commands?.length > 0
      ? guildSettings.disabled_commands.slice(0, 10).map(c => `\`${c}\``).join(", ") +
        (guildSettings.disabled_commands.length > 10 ? ` +${guildSettings.disabled_commands.length - 10} more` : "")
      : "None";

    const disabledChannelsDisplay = guildSettings.disabled?.length > 0
      ? guildSettings.disabled.slice(0, 5).map(c => `<#${c}>`).join(", ") +
        (guildSettings.disabled.length > 5 ? ` +${guildSettings.disabled.length - 5} more` : "")
      : "None";

    const tagRolesDisplay = guildSettings.tag_roles?.length > 0
      ? guildSettings.tag_roles.map(r => `<@&${r}>`).join(", ")
      : "None (everyone can use tags)";

    return {
      embeds: [{
        color: 0x5865f2,
        title: `⚙️ Server Settings for ${this.guild.name}`,
        thumbnail: {
          url: this.guild.iconURL("png", 256),
        },
        fields: [
          {
            name: "🔧 Prefix",
            value: `\`${guildSettings.prefix ?? process.env.PREFIX ?? "&"}\``,
            inline: true,
          },
          {
            name: "🚫 Disabled Commands",
            value: disabledCommandsDisplay,
            inline: true,
          },
          {
            name: "📵 Disabled Channels",
            value: disabledChannelsDisplay,
            inline: false,
          },
          {
            name: "🏷️ Tag Roles",
            value: tagRolesDisplay,
            inline: false,
          },
        ],
        footer: {
          text: "Use /serversettings prefix <new_prefix> to change the prefix",
        },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  async setPrefix(prefix) {
    if (!prefix) {
      const guildSettings = await this.database.getGuild(this.guild.id);
      return `📝 Current prefix: \`${guildSettings.prefix ?? process.env.PREFIX ?? "&"}\`\n\nUse \`/serversettings prefix <new_prefix>\` to change it.`;
    }

    if (prefix.length > 15) {
      this.success = false;
      return "❌ Prefix must be 15 characters or less.";
    }

    if (prefix.includes(" ")) {
      this.success = false;
      return "❌ Prefix cannot contain spaces.";
    }

    await this.database.setPrefix(prefix, this.guild);
    return `✅ Server prefix has been changed to \`${prefix}\``;
  }

  static flags = [
    {
      name: "view",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "View current server settings",
    },
    {
      name: "prefix",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "Change the server prefix for classic commands",
      options: [
        {
          name: "prefix",
          type: Constants.ApplicationCommandOptionTypes.STRING,
          description: "The new prefix (max 15 characters)",
          required: true,
        },
      ],
    },
  ];

  static description = "View and manage server settings";
  static aliases = ["serversettings", "guildsettings", "config"];
}

export default ServerSettingsCommand;
