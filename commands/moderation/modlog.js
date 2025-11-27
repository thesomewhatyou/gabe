import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class ModLogCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.member) return "❌ I can't find you in this server.";

    if (!this.database) {
      return "❌ Database is not configured.";
    }

    // Permission check - only mods can view mod logs
    if (
      !this.member.permissions.has(Constants.Permissions.MODERATE_MEMBERS) &&
      !this.member.permissions.has(Constants.Permissions.KICK_MEMBERS) &&
      !this.member.permissions.has(Constants.Permissions.BAN_MEMBERS) &&
      this.author.id !== process.env.OWNER
    ) {
      return "❌ You need moderation permissions to view mod logs.";
    }

    if (!this.permissions.has("EMBED_LINKS")) {
      return "❌ I need permission to embed links!";
    }

    const userInput = this.getOptionUser("user") ?? this.args[0];
    const limit = this.getOptionInteger("limit") ?? 10;

    let targetUser = null;
    let logs;

    if (userInput) {
      targetUser = typeof userInput === "string"
        ? await this.client.rest.users.get(userInput.replace(/<@!?|>/g, "")).catch(() => null)
        : userInput;

      if (!targetUser) {
        return "❌ Could not find that user.";
      }

      logs = await this.database.getModLogs(this.guild.id, targetUser.id, limit);
    } else {
      logs = await this.database.getModLogs(this.guild.id, undefined, limit);
    }

    if (logs.length === 0) {
      this.success = true;
      if (targetUser) {
        return `✅ No moderation history found for **${targetUser.tag}**.`;
      }
      return "✅ No moderation history found for this server.";
    }

    const actionEmojis = {
      ban: "🔨",
      kick: "👢",
      timeout: "⏰",
      warn: "⚠️",
      clear_warnings: "🧹",
    };

    const logEntries = await Promise.all(logs.slice(0, 10).map(async (log) => {
      const date = new Date(log.created_at);
      const timestamp = Math.floor(date.getTime() / 1000);
      const emoji = actionEmojis[log.action] ?? "📋";
      
      let userTag = `<@${log.user_id}>`;
      let modTag = `<@${log.moderator_id}>`;

      const reason = log.reason 
        ? (log.reason.length > 40 ? log.reason.slice(0, 40) + "..." : log.reason)
        : "No reason provided";

      return `${emoji} **${log.action.toUpperCase()}** - <t:${timestamp}:R>\n┣ User: ${userTag}\n┣ Mod: ${modTag}\n┗ ${reason}`;
    }));

    const title = targetUser 
      ? `📋 Mod Log for ${targetUser.tag}`
      : `📋 Recent Mod Actions`;

    this.success = true;
    return {
      embeds: [{
        color: 0x5865f2,
        title,
        description: logEntries.join("\n\n"),
        footer: {
          text: `Showing ${logs.length} of ${logs.length} entries • ${this.guild.name}`,
        },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "View mod history for a specific user (optional)",
    },
    {
      name: "limit",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Number of entries to show (default: 10, max: 25)",
      minValue: 1,
      maxValue: 25,
    },
  ];

  static description = "View moderation history for the server or a user";
  static aliases = ["modlogs", "history", "modhistory"];
}

export default ModLogCommand;
