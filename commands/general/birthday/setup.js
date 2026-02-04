import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class SetupBirthdayCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    // Only admins can setup birthdays
    if (!this.member?.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
      return "❌ You need Administrator permission to configure the birthday system.";
    }

    const action = this.getOptionString("action") ?? this.args[0];

    if (!action) {
      const settings = await this.database.getBirthdaySettings(this.guild.id);
      return `🎂 **Birthday System Settings**

**Status:** ${settings.enabled ? "✅ Enabled" : "❌ Disabled"}
**Channel:** ${settings.channel_id ? `<#${settings.channel_id}>` : "Not set"}
**Role:** ${settings.role_id ? `<@&${settings.role_id}>` : "Not set"}

Use \`birthday setup <action>\`:
• \`enable\` / \`disable\` - Toggle announcements
• \`channel <#channel>\` - Set announcement channel
• \`role @role\` - Set birthday role
• \`message <text>\` - Set custom message`;
    }

    const settings = await this.database.getBirthdaySettings(this.guild.id);

    switch (action.toLowerCase()) {
      case "enable": {
        if (!settings.channel_id) {
          return "❌ Please set an announcement channel first with `birthday setup channel #channel`.";
        }
        settings.enabled = true;
        await this.database.setBirthdaySettings(settings);
        this.success = true;
        return "✅ Birthday announcements have been **enabled**.";
      }

      case "disable": {
        settings.enabled = false;
        await this.database.setBirthdaySettings(settings);
        this.success = true;
        return "✅ Birthday announcements have been **disabled**.";
      }

      case "channel": {
        const channel = this.getOptionChannel("value") ?? this.args[1];
        if (!channel) {
          return "❌ Please specify a channel.";
        }
        const targetChannel =
          typeof channel === "string" ? this.guild.channels.get(channel.replace(/[<#>]/g, "")) : channel;
        if (!targetChannel) {
          return "❌ Channel not found.";
        }
        settings.channel_id = targetChannel.id;
        await this.database.setBirthdaySettings(settings);
        this.success = true;
        return `✅ Birthday announcements will be sent to <#${targetChannel.id}>.`;
      }

      case "role": {
        const role = this.getOptionRole("value") ?? this.args[1];
        if (!role) {
          return "❌ Please specify a role.";
        }
        const roleId = typeof role === "string" ? role.replace(/[<@&>]/g, "") : role.id;
        const guildRole = this.guild.roles.get(roleId);
        if (!guildRole) {
          return "❌ Role not found.";
        }
        settings.role_id = guildRole.id;
        await this.database.setBirthdaySettings(settings);
        this.success = true;
        return `✅ Birthday role set to **${guildRole.name}**. This will be assigned on birthdays and removed at end of day.`;
      }

      case "message": {
        const message = this.args.slice(1).join(" ");
        if (!message) {
          return `❌ Please provide a message.\n\nVariables: \`{user}\`, \`{username}\`, \`{age}\``;
        }
        settings.message = message;
        await this.database.setBirthdaySettings(settings);
        this.success = true;
        return "✅ Birthday message updated.";
      }

      default:
        return "❌ Unknown action. Use `birthday setup` to see options.";
    }
  }

  static flags = [
    {
      name: "action",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Setup action",
      required: false,
      choices: [
        { name: "Enable", value: "enable" },
        { name: "Disable", value: "disable" },
        { name: "Set Channel", value: "channel" },
        { name: "Set Role", value: "role" },
        { name: "Set Message", value: "message" },
      ],
    },
    {
      name: "value",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The value for the setting",
      required: false,
    },
  ];

  static description = "Configure birthday announcements (admin only)";
  static aliases = ["config"];
  static dbRequired = true;
}

export default SetupBirthdayCommand;
