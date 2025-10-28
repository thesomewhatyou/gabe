import { Constants, Permission } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class KickCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, pal.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Strange.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Permission.KICK_MEMBERS) && this.author.id !== process.env.OWNER) {
      return "❌ Gabe says: You don't have permission to kick members. Maybe ask nicely?";
    }

    const user = this.options.user ?? this.args[0];
    if (!user) return "❌ Gabe says: Who am I supposed to kick? Tell me!";

    const reason = this.options.reason ?? this.args.slice(1).join(" ") ?? "Gabe's decision";

    try {
      const userToKick = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;

      if (!userToKick) return "❌ Gabe says: That user doesn't exist. Try again.";

      const memberToKick = guild.members.get(userToKick.id);
      if (!memberToKick) return "❌ Gabe says: That user isn't in this server.";

      const myMember = guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Permission.KICK_MEMBERS)) {
        return "❌ Gabe says: I don't have permission to kick members. Fix that!";
      }

      if (
        memberToKick.permissions.has(Permission.ADMINISTRATOR) ||
        memberToKick.permissions.has(Permission.KICK_MEMBERS)
      ) {
        return "❌ Gabe says: I'm not kicking a mod/admin. That's risky business.";
      }

      if (userToKick.id === this.author.id) {
        return "❌ Gabe says: You can't kick yourself! Just leave if you want out.";
      }

      if (userToKick.id === this.client.user.id) {
        return "❌ Gabe says: I'm not kicking myself. That's just rude!";
      }

      await memberToKick.kick(`${this.author.tag}: ${reason}`);

      this.success = true;
      return `👢 **KICKED!** ${userToKick.tag} has been booted by Gabe.\n*Reason:* ${reason}`;
    } catch (error) {
      return `❌ Gabe says: Something broke. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to kick",
      required: true,
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The reason for the kick",
    },
  ];

  static description = "Kicks a user from the server";
  static aliases = ["boot", "remove"];
  static requiresPermission = true;
}

export default KickCommand;
