import { Constants, Permissions } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class TimeoutCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Permissions.MODERATE_MEMBERS) && this.author.id !== process.env.OWNER) {
      return "❌ Gabe says: You don't have permission to timeout members. Tough luck!";
    }

    const user = this.getOptionUser("user", true) ?? this.args[0];
    if (!user) return "❌ Gabe says: Tell me who to timeout, will ya?";

    const duration = this.getOptionInteger("duration") ?? parseInt(this.args[1]) ?? 60;
    if (duration < 1 || duration > 40320) {
      return "❌ Gabe says: Duration must be between 1 and 40320 minutes (28 days).";
    }

    const defaultReasons = ["Gabe has chosen", "Gabe has deemed this user unworthy"];
    const reason =
      this.getOptionString("reason") ??
      this.args.slice(2).join(" ") ??
      defaultReasons[Math.floor(Math.random() * defaultReasons.length)];

    try {
      let userId = user;
      if (typeof user === "string") {
        const mentionMatch = user.match(/^<@!?(\d+)>$/);
        userId = mentionMatch ? mentionMatch[1] : user;
      }

      const userToTimeout =
        typeof userId === "string" ? await this.client.rest.users.get(userId).catch(() => null) : userId;

      if (!userToTimeout) return "❌ Gabe says: Can't find that user. Are you sure they exist?";

      const memberToTimeout = guild.members.get(userToTimeout.id);
      if (!memberToTimeout) return "❌ Gabe says: That user isn't in this server.";

      const myMember = guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Permissions.MODERATE_MEMBERS)) {
        return "❌ Gabe says: I don't have permission to timeout members. Give me power!";
      }

      if (
        memberToTimeout.permissions.has(Permissions.ADMINISTRATOR) ||
        memberToTimeout.permissions.has(Permissions.MODERATE_MEMBERS)
      ) {
        return "❌ Gabe says: I'm not timing out a mod/admin. That's a bad idea.";
      }

      if (userToTimeout.id === this.author.id) {
        return "❌ Gabe says: You can't timeout yourself! What kind of logic is that?";
      }

      if (userToTimeout.id === this.client.user.id) {
        return "❌ Gabe says: I'm not timing myself out. That's counterproductive!";
      }

      const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);

      await memberToTimeout.edit(
        {
          communicationDisabledUntil: timeoutUntil,
        },
        `${this.author.tag}: ${reason}`,
      );

      this.success = true;
      return `⏰ **TIMED OUT!** ${userToTimeout.tag} has been silenced by Gabe for ${duration} minutes.\n*Reason:* ${reason}`;
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to timeout",
      required: true,
    },
    {
      name: "duration",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Duration in minutes (1-40320, default: 60)",
      minValue: 1,
      maxValue: 40320,
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The reason for the timeout",
    },
  ];

  static description = "Times out a user";
  static aliases = ["mute", "silence", "shush"];
  static requiresPermission = true;
}

export default TimeoutCommand;
