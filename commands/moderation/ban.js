import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BanCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Constants.Permissions.BAN_MEMBERS) && this.author.id !== process.env.OWNER) {
      return "❌ Gabe says: You don't have permission to ban members. Nice try though!";
    }

    const user = this.options?.user ?? this.getOptionUser("user") ?? this.args[0];
    if (!user) return "❌ Gabe says: You gotta tell me who to ban, genius.";

    const reason = this.options?.reason ?? this.getOptionString("reason") ?? this.args.slice(1).join(" ") ?? "Gabe's judgement";
    const days = this.options?.days ?? this.getOptionInteger("days") ?? 0;

    try {
      const userToBan = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;

      if (!userToBan) return "❌ Gabe says: I can't find that user. Are they even real?";

      const memberToBan = guild.members.get(userToBan.id);

      if (memberToBan) {
        const myMember = guild.members.get(this.client.user.id);
        if (!myMember?.permissions.has(Constants.Permissions.BAN_MEMBERS)) {
          return "❌ Gabe says: I don't have permission to ban members. Give me more power!";
        }

        if (
          memberToBan.permissions.has(Constants.Permissions.ADMINISTRATOR) ||
          memberToBan.permissions.has(Constants.Permissions.BAN_MEMBERS)
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

      // Try to DM the user before banning (if they have DM notifications enabled)
      let dmSent = false;
      let dmDisabledByUser = false;
      try {
        const userPrefs = this.database ? await this.database.getUserPreferences(userToBan.id) : null;
        if (userPrefs?.dm_notifications === false) {
          dmDisabledByUser = true;
        } else {
          const dmChannel = await userToBan.createDM();
          await dmChannel.createMessage({
            embeds: [{
              color: 0xff0000,
              title: "🔨 You have been banned",
              description: `You have been banned from **${guild.name}**.`,
              fields: [
                { name: "Reason", value: reason, inline: false },
                { name: "Moderator", value: this.author.tag, inline: true },
              ],
              timestamp: new Date().toISOString(),
            }],
          });
          dmSent = true;
        }
      } catch {
        // User has DMs disabled or bot is blocked - continue with ban
      }

      await guild.createBan(userToBan.id, {
        deleteMessageSeconds: days * 86400,
        reason: `${this.author.tag}: ${reason}`,
      });

      // Log the moderation action
      if (this.database) {
        await this.database.addModLog(guild.id, userToBan.id, this.author.id, "ban", reason);
      }

      this.success = true;
      const dmNote = dmSent ? "" : "\n*(User could not be notified via DM)*";
      return `🔨 **BANNED!** ${userToBan.tag} has been yeeted by Gabe.\n*Reason:* ${reason}${dmNote}`;
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
