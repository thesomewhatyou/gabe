import { Constants, Permissions } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BanCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Permissions.BAN_MEMBERS) && this.author.id !== process.env.OWNER) {
      return "❌ Gabe says: You don't have permission to ban members. Nice try though!";
    }

    const user = this.options.user ?? this.args[0];
    if (!user) return "❌ Gabe says: You gotta tell me who to ban, genius.";

    const defaultReasons = ["Gabe has chosen", "Gabe has deemed this user unworthy"];
    const reason =
      this.options.reason ??
      this.args.slice(1).join(" ") ??
      defaultReasons[Math.floor(Math.random() * defaultReasons.length)];
    const days = this.options.days ?? 0;

    try {
      let userId = user;
      if (typeof user === "string") {
        const mentionMatch = user.match(/^<@!?(\d+)>$/);
        userId = mentionMatch ? mentionMatch[1] : user;
      }

      const userToBan =
        typeof userId === "string" ? await this.client.rest.users.get(userId).catch(() => null) : userId;

      if (!userToBan) return "❌ Gabe says: I can't find that user. Are they even real?";

      const memberToBan = guild.members.get(userToBan.id);

      if (memberToBan) {
        const myMember = guild.members.get(this.client.user.id);
        if (!myMember?.permissions.has(Permissions.BAN_MEMBERS)) {
          return "❌ Gabe says: I don't have permission to ban members. Give me more power!";
        }

        if (
          memberToBan.permissions.has(Permissions.ADMINISTRATOR) ||
          memberToBan.permissions.has(Permissions.BAN_MEMBERS)
        ) {
          return "❌ Gabe says: I'm not banning a mod/admin. That's above my pay grade.";
        }

        if (userToBan.id === this.author.id) {
          return "❌ Gabe says: You can't ban yourself! What are you thinking?";
        }

        if (userToBan.id === this.client.user.id) {
          return "❌ Gabe says: I'm not banning myself. That's suicide!";
        }
      }

      await guild.createBan(userToBan.id, {
        deleteMessageSeconds: days * 86400,
        reason: `${this.author.tag}: ${reason}`,
      });

      this.success = true;
      return `🔨 **BANNED!** ${userToBan.tag} has been yeeted by Gabe.\n*Reason:* ${reason}`;
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to ban",
      required: true,
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The reason for the ban",
    },
    {
      name: "days",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Number of days of messages to delete (0-7)",
      minValue: 0,
      maxValue: 7,
    },
  ];

  static description = "Bans a user from the server";
  static aliases = ["yeet", "begone"];
  static requiresPermission = true;
}

export default BanCommand;
