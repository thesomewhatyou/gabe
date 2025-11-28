import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class TimeoutCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Constants.Permissions.MODERATE_MEMBERS) && !isOwner(this.author?.id)) {
      return "❌ Gabe says: You don't have permission to timeout members. Tough luck!";
    }

    const user = this.options?.user ?? this.getOptionUser("user") ?? this.args[0];
    if (!user) return "❌ Gabe says: Tell me who to timeout, will ya?";

    const parsedDurationArg = parseInt(this.args[1], 10);
    const duration =
      this.options?.duration ??
      this.getOptionInteger("duration") ??
      (Number.isNaN(parsedDurationArg) ? undefined : parsedDurationArg) ??
      60;
    if (duration < 1 || duration > 40320) {
      return "❌ Gabe says: Duration must be between 1 and 40320 minutes (28 days).";
    }

    const reason =
      this.options?.reason ?? this.getOptionString("reason") ?? this.args.slice(2).join(" ") ?? "Gabe's timeout";

    try {
      const userToTimeout = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;

      if (!userToTimeout) return "❌ Gabe says: Can't find that user. Are you sure they exist?";

      const memberToTimeout = guild.members.get(userToTimeout.id);
      if (!memberToTimeout) return "❌ Gabe says: That user isn't in this server.";

      const myMember = guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Constants.Permissions.MODERATE_MEMBERS)) {
        return "❌ Gabe says: I don't have permission to timeout members. Give me power!";
      }

      if (
        memberToTimeout.permissions.has(Constants.Permissions.ADMINISTRATOR) ||
        memberToTimeout.permissions.has(Constants.Permissions.MODERATE_MEMBERS)
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
      const timeoutTimestamp = Math.floor(timeoutUntil.getTime() / 1000);

      // Format duration for display
      const formatDuration = (mins) => {
        if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""}`;
        if (mins < 1440) {
          const hours = Math.floor(mins / 60);
          return `${hours} hour${hours !== 1 ? "s" : ""}`;
        }
        const days = Math.floor(mins / 1440);
        return `${days} day${days !== 1 ? "s" : ""}`;
      };

      // Try to DM the user before timing out (if they have DM notifications enabled)
      let dmSent = false;
      try {
        const userPrefs = this.database ? await this.database.getUserPreferences(userToTimeout.id) : null;
        if (userPrefs?.dm_notifications !== false) {
          const dmChannel = await userToTimeout.createDM();
          await dmChannel.createMessage({
            embeds: [{
              color: 0xffff00,
              title: "⏰ You have been timed out",
              description: `You have been timed out in **${guild.name}**.`,
              fields: [
                { name: "Duration", value: formatDuration(duration), inline: true },
                { name: "Expires", value: `<t:${timeoutTimestamp}:R>`, inline: true },
                { name: "Reason", value: reason, inline: false },
                { name: "Moderator", value: this.author.tag, inline: true },
              ],
              timestamp: new Date().toISOString(),
            }],
          });
          dmSent = true;
        }
      } catch {
        // User has DMs disabled or bot is blocked - continue with timeout
      }

      await memberToTimeout.edit(
        {
          communicationDisabledUntil: timeoutUntil,
        },
        `${this.author.tag}: ${reason}`,
      );

      // Log the moderation action
      if (this.database) {
        await this.database.addModLog(guild.id, userToTimeout.id, this.author.id, "timeout", `${reason} (${formatDuration(duration)})`);
      }

      this.success = true;
      const dmNote = dmSent ? "" : "\n*(User could not be notified via DM)*";
      return `⏰ **TIMED OUT!** ${userToTimeout.tag} has been silenced by Gabe for ${duration} minutes.\n*Reason:* ${reason}${dmNote}`;
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
