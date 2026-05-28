import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class NicknameCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

    if (!this.member.permissions.has(Constants.Permissions.MANAGE_NICKNAMES) && !isOwner(this.author?.id)) {
      return "❌ Gabe says: You don't have permission to manage nicknames. Nice try though!";
    }

    const user = this.options?.user ?? this.getOptionUser("user") ?? this.args[0];
    if (!user) return "❌ Gabe says: Tell me whose nickname to change and I can handle it.";

    const nickname = this.options?.nickname ?? this.getOptionString("nickname") ?? this.args.slice(1).join(" ");

    try {
      const targetUser = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;
      if (!targetUser) return "❌ Gabe says: I can't find that user. Are they even real?";

      const targetMember = this.guild.members.get(targetUser.id);
      if (!targetMember) return "❌ Gabe says: That user isn't in this server.";

      const myMember = this.guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Constants.Permissions.MANAGE_NICKNAMES)) {
        return "❌ Gabe says: I don't have permission to manage nicknames. Give me more power!";
      }

      // Check role hierarchy
      const myHighestRole = myMember.roles
        .map((id) => this.guild.roles.get(id))
        .filter(Boolean)
        .sort((a, b) => b.position - a.position)[0];

      const targetHighestRole = targetMember.roles
        .map((id) => this.guild.roles.get(id))
        .filter(Boolean)
        .sort((a, b) => b.position - a.position)[0];

      if (targetHighestRole && myHighestRole && targetHighestRole.position >= myHighestRole.position) {
        return "❌ Gabe says: That user has a role equal to or higher than mine. Can't touch 'em!";
      }

      // Can't change server owner's nickname
      if (targetUser.id === this.guild.ownerID) {
        return "❌ Gabe says: I can't change the server owner's nickname. They're the boss!";
      }

      const oldNick = targetMember.nick ?? targetUser.username;

      await targetMember.edit({
        nick: nickname || null, // null or empty removes nickname
        reason: `Nickname changed by ${this.author.tag}`,
      });

      this.success = true;
      if (!nickname) {
        return `📝 Removed nickname from **${targetUser.tag}** (was: ${oldNick})`;
      }
      return `📝 Changed **${targetUser.tag}**'s nickname from **${oldNick}** to **${nickname}**`;
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to change the nickname of",
      required: true,
    },
    {
      name: "nickname",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The new nickname (leave empty to remove)",
    },
  ];

  static description = "Change a user's nickname";
  static aliases = ["nick", "setnick", "rename"];
}

export default NicknameCommand;
