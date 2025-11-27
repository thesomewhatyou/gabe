import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class WarningsCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.member) return "❌ I can't find you in this server.";

    if (!this.database) {
      return "❌ Database is not configured.";
    }

    if (!this.permissions.has("EMBED_LINKS")) {
      return "❌ I need permission to embed links!";
    }

    const subcommand = this.interaction
      ? this.interaction.data.options.getSubCommand()?.[0]
      : this.args[0]?.toLowerCase();

    // Default to "view" if first arg looks like a user
    if (!subcommand || !["view", "delete", "clear"].includes(subcommand)) {
      return this.viewWarnings(this.args[0]);
    }

    if (subcommand === "view") {
      const user = this.getOptionUser("user") ?? this.args[1];
      return this.viewWarnings(user);
    }

    if (subcommand === "delete" || subcommand === "remove") {
      const warningId = this.getOptionInteger("id") ?? parseInt(this.args[1]);
      return this.deleteWarning(warningId);
    }

    if (subcommand === "clear") {
      const user = this.getOptionUser("user") ?? this.args[1];
      return this.clearWarnings(user);
    }

    return this.viewWarnings();
  }

  async viewWarnings(userInput) {
    const user = userInput ?? this.author;

    const targetUser = typeof user === "string"
      ? await this.client.rest.users.get(user.replace(/<@!?|>/g, "")).catch(() => null)
      : user;

    if (!targetUser) {
      return "❌ Could not find that user.";
    }

    const warnings = await this.database.getWarnings(this.guild.id, targetUser.id);

    if (warnings.length === 0) {
      this.success = true;
      return `✅ **${targetUser.tag}** has no warnings in this server.`;
    }

    const warningList = warnings.slice(0, 10).map((w, i) => {
      const date = new Date(w.created_at);
      const timestamp = Math.floor(date.getTime() / 1000);
      return `**#${w.id}** - <t:${timestamp}:R>\n┗ ${w.reason.length > 50 ? w.reason.slice(0, 50) + "..." : w.reason}`;
    }).join("\n\n");

    this.success = true;
    return {
      embeds: [{
        color: 0xffa500,
        title: `⚠️ Warnings for ${targetUser.tag}`,
        description: warningList,
        footer: {
          text: `Total: ${warnings.length} warning${warnings.length !== 1 ? "s" : ""} • Use /warnings delete <id> to remove`,
        },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  async deleteWarning(warningId) {
    // Permission check for deletion
    if (
      !this.member.permissions.has(Constants.Permissions.MODERATE_MEMBERS) &&
      this.author.id !== process.env.OWNER
    ) {
      return "❌ You need Moderate Members permission to delete warnings.";
    }

    if (!warningId || isNaN(warningId)) {
      return "❌ Please provide a valid warning ID to delete.";
    }

    const deleted = await this.database.removeWarning(this.guild.id, warningId);

    if (!deleted) {
      return `❌ Warning #${warningId} not found in this server.`;
    }

    this.success = true;
    return `✅ Warning #${warningId} has been deleted.`;
  }

  async clearWarnings(userInput) {
    // Permission check for clearing
    if (
      !this.member.permissions.has(Constants.Permissions.MODERATE_MEMBERS) &&
      this.author.id !== process.env.OWNER
    ) {
      return "❌ You need Moderate Members permission to clear warnings.";
    }

    if (!userInput) {
      return "❌ Please specify a user to clear warnings for.";
    }

    const targetUser = typeof userInput === "string"
      ? await this.client.rest.users.get(userInput.replace(/<@!?|>/g, "")).catch(() => null)
      : userInput;

    if (!targetUser) {
      return "❌ Could not find that user.";
    }

    const count = await this.database.clearWarnings(this.guild.id, targetUser.id);

    if (count === 0) {
      return `❌ **${targetUser.tag}** has no warnings to clear.`;
    }

    // Log the action
    await this.database.addModLog(this.guild.id, targetUser.id, this.author.id, "clear_warnings", `Cleared ${count} warning(s)`);

    this.success = true;
    return `✅ Cleared **${count}** warning${count !== 1 ? "s" : ""} from ${targetUser.tag}.`;
  }

  static flags = [
    {
      name: "view",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "View warnings for a user",
      options: [
        {
          name: "user",
          type: Constants.ApplicationCommandOptionTypes.USER,
          description: "The user to view warnings for (defaults to yourself)",
        },
      ],
    },
    {
      name: "delete",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "Delete a specific warning",
      options: [
        {
          name: "id",
          type: Constants.ApplicationCommandOptionTypes.INTEGER,
          description: "The warning ID to delete",
          required: true,
        },
      ],
    },
    {
      name: "clear",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "Clear all warnings for a user",
      options: [
        {
          name: "user",
          type: Constants.ApplicationCommandOptionTypes.USER,
          description: "The user to clear warnings for",
          required: true,
        },
      ],
    },
  ];

  static description = "View, delete, or clear warnings for users";
  static aliases = ["warns", "infractions"];
}

export default WarningsCommand;
