import Command from "#cmd-classes/command.js";

class DisableCommand extends Command {
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

    // Check if already disabled
    const isEnabled = await this.database.isLevelsEnabled(this.guild.id);
    if (!isEnabled) {
      this.success = false;
      return "✅ The leveling system is already disabled in this server.";
    }

    // Disable leveling
    await this.database.setLevelsEnabled(this.guild.id, false);

    return "✅ **Leveling system disabled!** Users will no longer earn XP. Existing XP and levels are preserved.";
  }

  static description = "Disable the leveling system";
  static aliases = [];
  static dbRequired = true;
}

export default DisableCommand;
