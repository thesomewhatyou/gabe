import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class SetupTicketCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    // Only admins can setup tickets
    if (!this.member?.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
      return "❌ You need Administrator permission to set up the ticket system.";
    }

    const action = this.getOptionString("action") ?? this.args[0];

    if (!action) {
      // Show current settings
      const settings = await this.database.getTicketSettings(this.guild.id);
      return `🎫 **Ticket System Settings**

**Status:** ${settings.enabled ? "✅ Enabled" : "❌ Disabled"}
**Category:** ${settings.category_id ? `<#${settings.category_id}>` : "Not set"}
**Support Role:** ${settings.support_role_id ? `<@&${settings.support_role_id}>` : "Not set"}
**Log Channel:** ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : "Not set"}
**Max tickets per user:** ${settings.max_open_per_user}

Use \`ticket setup <action>\` to configure:
• \`enable\` / \`disable\` - Toggle the ticket system
• \`category <#channel>\` - Set ticket category
• \`role @role\` - Set support role
• \`log <#channel>\` - Set log channel
• \`message <text>\` - Set welcome message
• \`maxopen <number>\` - Max tickets per user`;
    }

    const settings = await this.database.getTicketSettings(this.guild.id);

    switch (action.toLowerCase()) {
      case "enable": {
        settings.enabled = true;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return "✅ Ticket system has been **enabled**.";
      }

      case "disable": {
        settings.enabled = false;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return "✅ Ticket system has been **disabled**.";
      }

      case "category": {
        let channel = this.getOptionChannel("value");
        if (!channel) {
          const value = this.getOptionString("value") ?? this.args[1];
          if (value) {
            channel = this.guild.channels.get(value.replace(/[<#>]/g, ""));
          }
        }
        if (!channel || channel.type !== Constants.ChannelTypes.GUILD_CATEGORY) {
          return "❌ Please specify a valid category channel.";
        }
        settings.category_id = channel.id;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return `✅ Tickets will now be created in **${channel.name}**.`;
      }

      case "role": {
        let role = this.getOptionRole("value");
        if (!role) {
          const value = this.getOptionString("value") ?? this.args[1];
          if (value) {
            role = this.guild.roles.get(value.replace(/[<@&>]/g, ""));
          }
        }
        if (!role) {
          return "❌ Role not found.";
        }
        settings.support_role_id = role.id;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return `✅ Support role set to **${role.name}**.`;
      }

      case "log": {
        let logChannel = this.getOptionChannel("value");
        if (!logChannel) {
          const value = this.getOptionString("value") ?? this.args[1];
          if (value) {
            logChannel = this.guild.channels.get(value.replace(/[<#>]/g, ""));
          }
        }
        if (!logChannel) {
          return "❌ Channel not found.";
        }
        if (logChannel.type !== Constants.ChannelTypes.GUILD_TEXT) {
          return "❌ Log channel must be a text channel.";
        }
        settings.log_channel_id = logChannel.id;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return `✅ Ticket logs will be sent to <#${logChannel.id}>.`;
      }

      case "message": {
        const message = this.getOptionString("value") ?? this.args.slice(1).join(" ");
        if (!message) {
          return `❌ Please provide a welcome message.\n\nVariables: \`{user}\`, \`{username}\`, \`{category}\`, \`{ticket_id}\``;
        }
        settings.ticket_message = message;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return `✅ Ticket welcome message updated.`;
      }

      case "maxopen": {
        const val = this.getOptionString("value") ?? this.args[1];
        const max = parseInt(val);
        if (isNaN(max) || max < 1 || max > 10) {
          return "❌ Please specify a number between 1 and 10.";
        }
        settings.max_open_per_user = max;
        await this.database.setTicketSettings(settings);
        this.success = true;
        return `✅ Users can now have up to **${max}** open ticket(s).`;
      }

      default:
        return "❌ Unknown action. Use `ticket setup` to see available options.";
    }
  }

  static flags = [
    {
      name: "action",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Setup action (enable, disable, category, role, log, message, maxopen)",
      required: false,
      choices: [
        { name: "Enable", value: "enable" },
        { name: "Disable", value: "disable" },
        { name: "Set Category", value: "category" },
        { name: "Set Role", value: "role" },
        { name: "Set Log Channel", value: "log" },
        { name: "Set Welcome Message", value: "message" },
        { name: "Max Open Tickets", value: "maxopen" },
      ],
    },
    {
      name: "value",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The value for the setting",
      required: false,
    },
  ];

  static description = "Configure the ticket system (admin only)";
  static aliases = ["config", "configure"];
  static dbRequired = true;
}

export default SetupTicketCommand;
