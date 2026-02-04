import { Constants, TextChannel } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class LockCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

    if (!this.member.permissions.has(Constants.Permissions.MANAGE_CHANNELS) && !isOwner(this.author?.id)) {
      return "❌ Gabe says: You don't have permission to manage channels. Nice try though!";
    }

    const reason = this.options?.reason ?? this.getOptionString("reason") ?? this.args.join(" ") ?? "Channel locked";

    try {
      const channel = this.channel;

      if (!(channel instanceof TextChannel)) {
        return "❌ Gabe says: This command only works in text channels.";
      }

      const myPerms = this.permissions;
      if (!myPerms.has(Constants.Permissions.MANAGE_ROLES)) {
        return "❌ Gabe says: I don't have permission to manage roles/permissions. Give me more power!";
      }

      // Get @everyone role
      const everyoneRole = this.guild.roles.get(this.guild.id);
      if (!everyoneRole) {
        return "❌ Gabe says: Couldn't find the @everyone role. That's... weird.";
      }

      // Deny send messages for @everyone
      await channel.editPermission(this.guild.id, {
        type: Constants.OverwriteTypes.ROLE,
        deny: Constants.Permissions.SEND_MESSAGES,
        reason: `${this.author.tag}: ${reason}`,
      });

      this.success = true;
      return `🔒 Channel locked! @everyone can no longer send messages.\n*Reason:* ${reason}`;
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Reason for locking the channel",
    },
  ];

  static description = "Lock the channel (prevent @everyone from sending messages)";
  static aliases = ["lockdown", "lockchannel"];
}

export default LockCommand;
