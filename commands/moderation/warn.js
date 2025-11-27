import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class WarnCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.member) return "❌ I can't find you in this server.";

    if (!this.database) {
      return "❌ Database is not configured. Warnings cannot be saved.";
    }

    const member = this.member;
    const guild = this.guild;

    // Permission check
    if (
      !member.permissions.has(Constants.Permissions.MODERATE_MEMBERS) &&
      !member.permissions.has(Constants.Permissions.KICK_MEMBERS) &&
      !isOwner(this.author?.id)
    ) {
      return "❌ You need Moderate Members or Kick Members permission to warn users.";
    }

    const user = this.getOptionUser("user") ?? this.args[0];
    if (!user) return "❌ Please specify a user to warn.";

    const reason = this.getOptionString("reason") ?? this.args.slice(1).join(" ");
    if (!reason) return "❌ Please provide a reason for the warning.";

    try {
      const userToWarn = typeof user === "string" 
        ? await this.client.rest.users.get(user).catch(() => null) 
        : user;

      if (!userToWarn) return "❌ I can't find that user.";

      const memberToWarn = guild.members.get(userToWarn.id);

      if (memberToWarn) {
        if (
          memberToWarn.permissions.has(Constants.Permissions.ADMINISTRATOR) ||
          memberToWarn.permissions.has(Constants.Permissions.MODERATE_MEMBERS)
        ) {
          return "❌ You can't warn a moderator or administrator.";
        }
      }

      if (userToWarn.id === this.author.id) {
        return "❌ You can't warn yourself!";
      }

      if (userToWarn.id === this.client.user.id) {
        return "❌ You can't warn me!";
      }

      // Add the warning
      const warningId = await this.database.addWarning(guild.id, userToWarn.id, this.author.id, reason);

      // Also log it as a mod action
      await this.database.addModLog(guild.id, userToWarn.id, this.author.id, "warn", reason);

      // Get total warning count
      const allWarnings = await this.database.getWarnings(guild.id, userToWarn.id);
      const warningCount = allWarnings.length;

      // Try to DM the user
      let dmSent = false;
      try {
        const userPrefs = await this.database.getUserPreferences(userToWarn.id);
        if (userPrefs?.dm_notifications !== false) {
          const dmChannel = await userToWarn.createDM();
          await dmChannel.createMessage({
            embeds: [{
              color: 0xffa500,
              title: "⚠️ You have been warned",
              description: `You have received a warning in **${guild.name}**.`,
              fields: [
                { name: "Reason", value: reason, inline: false },
                { name: "Warning #", value: `${warningCount}`, inline: true },
                { name: "Moderator", value: this.author.tag, inline: true },
              ],
              footer: { text: "Please follow the server rules to avoid further action." },
              timestamp: new Date().toISOString(),
            }],
          });
          dmSent = true;
        }
      } catch {
        // User has DMs disabled or bot is blocked
      }

      this.success = true;
      const dmNote = dmSent ? "" : "\n*(User could not be notified via DM)*";
      return `⚠️ **WARNING #${warningCount}** issued to ${userToWarn.tag}\n*Reason:* ${reason}\n*Warning ID:* \`${warningId}\`${dmNote}`;
    } catch (error) {
      return `❌ Something went wrong: ${error.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to warn",
      required: true,
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The reason for the warning",
      required: true,
    },
  ];

  static description = "Warn a user for rule violations";
  static aliases = ["strike"];
}

export default WarnCommand;
