import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class LevelsCommand extends Command {
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

        return {
            embeds: [
                {
                    title: "📊 Leveling System Management",
                    description: "Use the subcommands to manage the leveling system:",
                    color: 0x0099ff,
                    fields: [
                        {
                            name: "`/levels enable`",
                            value: "Enable the leveling system in this server",
                            inline: false,
                        },
                        {
                            name: "`/levels disable`",
                            value: "Disable the leveling system in this server",
                            inline: false,
                        },
                        {
                            name: "`/levels notifications <enabled>`",
                            value: "Enable or disable level-up notifications",
                            inline: false,
                        },
                        {
                            name: "`/levels add_xp <user> <amount>`",
                            value: "Add XP to a user",
                            inline: false,
                        },
                        {
                            name: "`/levels remove_xp <user> <amount>`",
                            value: "Remove XP from a user",
                            inline: false,
                        },
                        {
                            name: "`/levels set_level <user> <level>`",
                            value: "Set a user's level directly (calculates required XP)",
                            inline: false,
                        },
                    ],
                },
            ],
        };
    }

    static description = "Manage the leveling system (Administrator only)";
    static aliases = [];
    static dbRequired = true;
}

export default LevelsCommand;
