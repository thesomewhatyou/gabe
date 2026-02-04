import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeLogsCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ This only works in servers.";
    if (!this.member) return "❌ I can't find you in this server.";
    if (!this.database) return "❌ Database not available.";

    // Check permissions - only admins or bot owners
    if (!this.member.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
      return "❌ You need Administrator permissions to view anti-nuke logs.";
    }

    // Get recent actions (last 24 hours)
    const actions = await this.database.getRecentActions(this.guild.id, "", 86400);

    if (actions.length === 0) {
      this.success = true;
      return {
        embeds: [
          {
            color: 0x3498db,
            title: "📊 Anti-Nuke Activity Log",
            description: "No suspicious activity has been logged in the last 24 hours.",
            footer: { text: "This is a good sign!" },
          },
        ],
      };
    }

    // Group by executor
    const executorActions = new Map();
    for (const action of actions.slice(0, 25)) {
      const executorId = action.executor_id;
      if (!executorActions.has(executorId)) {
        executorActions.set(executorId, []);
      }
      executorActions.get(executorId).push(action);
    }

    const fields = [];
    for (const [executorId, userActions] of executorActions) {
      const actionSummary = userActions
        .slice(0, 5)
        .map((a) => `• ${a.action_type} ${a.target_id ? `(<@${a.target_id}>)` : ""}`)
        .join("\n");

      fields.push({
        name: `<@${executorId}> (${userActions.length} actions)`,
        value: actionSummary.substring(0, 1024),
        inline: false,
      });
    }

    this.success = true;
    return {
      embeds: [
        {
          color: 0xf39c12,
          title: "📊 Anti-Nuke Activity Log (Last 24h)",
          description: `Showing ${Math.min(actions.length, 25)} of ${actions.length} logged actions.`,
          fields: fields.slice(0, 10),
          footer: { text: "Actions older than 24 hours are automatically cleaned up" },
        },
      ],
    };
  }

  static description = "View recent anti-nuke activity and detected threats";
  static aliases = ["log", "history", "activity"];
  static dbRequired = true;
}

export default AntinukeLogsCommand;
