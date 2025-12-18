import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class KickCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, pal.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server. Strange.";

    const guild = this.guild;
    const member = this.member;

    if (!member.permissions.has(Constants.Permissions.KICK_MEMBERS) && !isOwner(this.author?.id)) {
      return "❌ Gabe says: You don't have permission to kick members. Maybe ask nicely?";
    }

    const user = this.options?.user ?? this.getOptionUser("user") ?? this.args[0];
    if (!user) return "❌ Gabe says: Who am I supposed to kick? Tell me!";

    const reason =
      this.options?.reason ?? this.getOptionString("reason") ?? this.args.slice(1).join(" ") ?? "Gabe's decision";

    try {
      const userToKick = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;

      if (!userToKick) return "❌ Gabe says: That user doesn't exist. Try again.";

      const memberToKick = guild.members.get(userToKick.id);
      if (!memberToKick) return "❌ Gabe says: That user isn't in this server.";

      const myMember = guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Constants.Permissions.KICK_MEMBERS)) {
        return "❌ Gabe says: I don't have permission to kick members. Fix that!";
      }

      if (
        memberToKick.permissions.has(Constants.Permissions.ADMINISTRATOR) ||
        memberToKick.permissions.has(Constants.Permissions.KICK_MEMBERS)
      ) {
        return "❌ Gabe says: I'm not kicking a mod/admin. That's risky business.";
      }

      if (userToKick.id === this.author.id) {
        return "❌ Gabe says: You can't kick yourself! Just leave if you want out.";
      }

      if (userToKick.id === this.client.user.id) {
        return "❌ Gabe says: I'm not kicking myself. That's just rude!";
      }

      // Try to DM the user before kicking (if they have DM notifications enabled)
      let dmSent = false;
      try {
        const userPrefs = this.database ? await this.database.getUserPreferences(userToKick.id) : null;
        if (userPrefs?.dm_notifications !== false) {
          const dmChannel = await userToKick.createDM();
          await dmChannel.createMessage({
            embeds: [
              {
                color: 0xffa500,
                title: "👢 You have been kicked",
                description: `You have been kicked from **${guild.name}**.`,
                fields: [
                  { name: "Reason", value: reason, inline: false },
                  { name: "Moderator", value: this.author.tag, inline: true },
                ],
                footer: { text: "You can rejoin the server if you have an invite link." },
                timestamp: new Date().toISOString(),
              },
            ],
          });
          dmSent = true;
        }
      } catch {
        // User has DMs disabled or bot is blocked - continue with kick
      }

      await memberToKick.kick(`${this.author.tag}: ${reason}`);

      // Log the moderation action
      if (this.database) {
        await this.database.addModLog(guild.id, userToKick.id, this.author.id, "kick", reason);
      }

      this.success = true;
      const dmNote = dmSent ? "" : "\n*(User could not be notified via DM)*";
      return `👢 **KICKED!** ${userToKick.tag} has been booted by Gabe.\n*Reason:* ${reason}${dmNote}`;
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
