import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class SetLevelCommand extends Command {
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

        // Get parameters
        let userId = this.options.user;
        let level = this.options.level;

        // For classic commands, parse from args
        if (!userId && this.message) {
            if (this.message.mentions.length === 0) {
                this.success = false;
                return "❌ Please mention a user to set the level for.";
            }
            userId = this.message.mentions[0].id;
            level = parseInt(this.args[0]);
        }

        if (!level || isNaN(level)) {
            this.success = false;
            return "❌ Please provide a valid level.";
        }

        if (level < 0) {
            this.success = false;
            return "❌ Level must be 0 or greater.";
        }

        // Calculate XP needed for the target level
        // Formula: level = floor(0.1 * sqrt(xp))
        // Inverse: xp = (level / 0.1)^2
        const targetXP = Math.floor(Math.pow(level / 0.1, 2));

        // Get current XP and calculate difference
        const userLevel = await this.database.getUserLevel(this.guild.id, userId);
        const xpDifference = targetXP - userLevel.xp;

        // Set the XP to match the target level
        const result = await this.database.addXP(this.guild.id, userId, xpDifference);

        return `✅ Set <@${userId}> to **level ${result.level}** with **${result.xp.toLocaleString()} XP**.`;
    }

    static description = "Set a user's level";
    static aliases = [];
    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to set the level for",
            required: true,
        },
        {
            name: "level",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "The level to set",
            required: true,
            minValue: 0,
        },
    ];
    static dbRequired = true;
}

export default SetLevelCommand;
