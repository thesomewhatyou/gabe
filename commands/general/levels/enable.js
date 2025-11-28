import Command from "#cmd-classes/command.js";

class EnableCommand extends Command {
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

        // Check if already enabled
        const isEnabled = await this.database.isLevelsEnabled(this.guild.id);
        if (isEnabled) {
            this.success = false;
            return "✅ The leveling system is already enabled in this server.";
        }

        // Enable leveling
        await this.database.setLevelsEnabled(this.guild.id, true);

        return "✅ **Leveling system enabled!** Users will now earn XP for chatting. Use `/rank` to check your level!";
    }

    static description = "Enable the leveling system";
    static aliases = [];
    static dbRequired = true;
}

export default EnableCommand;
