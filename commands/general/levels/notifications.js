import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class NotificationsCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "This command can only be used in servers.";
    }

    if (!this.database) {
      this.success = false;
      return "Database is not available.";
    }

    // Check if user has administrator permission
    if (!this.member || !this.member.permissions.has("ADMINISTRATOR")) {
      this.success = false;
      return "❌ You need the **Administrator** permission to manage the leveling system.";
    }

    // Get the enabled parameter
    const enabled = this.options.enabled !== undefined ? this.options.enabled : this.args[0]?.toLowerCase() === "true";

    // Set notification status
    await this.database.setLevelUpNotifications(this.guild.id, enabled);

    if (enabled) {
      return "✅ **Level-up notifications enabled!** The bot will announce when users level up.";
    } else {
      return "✅ **Level-up notifications disabled!** Users will still level up, but no announcements will be made.";
    }
  }

  static description = "Enable or disable level-up notifications";
  static aliases = [];
  static flags = [
    {
      name: "enabled",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      description: "Whether to enable notifications",
      required: true,
    },
  ];
  static dbRequired = true;
}

export default NotificationsCommand;
