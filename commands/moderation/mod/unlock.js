import { Constants, TextChannel } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class UnlockCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

    if (!this.member.permissions.has(Constants.Permissions.MANAGE_CHANNELS) && !isOwner(this.author?.id)) {
      return "❌ Gabe says: You don't have permission to manage channels. Nice try though!";
    }

    const reason = this.options?.reason ?? this.getOptionString("reason") ?? this.args.join(" ") ?? "Channel unlocked";

    try {
      const channel = this.channel;

      if (!(channel instanceof TextChannel)) {
        return "❌ Gabe says: This command only works in text channels.";
      }

      const myPerms = this.permissions;
      if (!myPerms.has(Constants.Permissions.MANAGE_ROLES)) {
        return "❌ Gabe says: I don't have permission to manage roles/permissions. Give me more power!";
      }

      // Remove the send messages deny for @everyone (reset to default)
      const existingOverwrite = channel.permissionOverwrites.get(this.guild.id);

      if (existingOverwrite) {
        // Remove the SEND_MESSAGES from deny
        const newDeny = existingOverwrite.deny & ~Constants.Permissions.SEND_MESSAGES;

        if (newDeny === 0n && existingOverwrite.allow === 0n) {
          // If no permissions left, delete the overwrite
          await channel.deletePermission(this.guild.id, `${this.author.tag}: ${reason}`);
        } else {
          await channel.editPermission(this.guild.id, {
            type: Constants.OverwriteTypes.ROLE,
            deny: newDeny,
            allow: existingOverwrite.allow,
            reason: `${this.author.tag}: ${reason}`,
          });
        }
      }

      this.success = true;
      return `🔓 Channel unlocked! @everyone can send messages again.\n*Reason:* ${reason}`;
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Reason for unlocking the channel",
    },
  ];

  static description = "Unlock the channel (allow @everyone to send messages)";
  static aliases = ["unlockdown", "unlockchannel"];
}

export default UnlockCommand;
