import { Constants, Permissions } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class UntimeoutCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, friend.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Permissions.MODERATE_MEMBERS) && this.author.id !== process.env.OWNER) {
      return "❌ Gabe says: You don't have permission to remove timeouts. Sorry!";
    }

    const user = this.getOptionUser("user", true);
    if (!user) return "❌ Gabe says: Who am I supposed to untimeout? Tell me!";

    const reason = this.getOptionString("reason", true) ?? "Gabe's mercy";

    try {
      const memberToUntimeout = guild.members.get(user.id);
      if (!memberToUntimeout) return "❌ Gabe says: That user isn't in this server.";

      const myMember = guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Permissions.MODERATE_MEMBERS)) {
        return "❌ Gabe says: I don't have permission to remove timeouts. Oops!";
      }

      if (!memberToUntimeout.communicationDisabledUntil) {
        return "❌ Gabe says: That user isn't even timed out. What are you doing?";
      }

      await memberToUntimeout.edit(
        {
          communicationDisabledUntil: null,
        },
        `${this.author.tag}: ${reason}`,
      );

      this.success = true;
      return `✅ **UNTIMEOUT!** ${user.tag} can talk again thanks to Gabe.\n*Reason:* ${reason}`;
    } catch (error) {
      return `❌ Gabe says: Something broke. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to untimeout",
      required: true,
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The reason for removing the timeout",
    },
  ];

  static description = "Removes a timeout from a user";
  static aliases = ["unmute", "unsilence"];
  static requiresPermission = true;
}

export default UntimeoutCommand;
