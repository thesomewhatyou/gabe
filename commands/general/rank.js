import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class RankCommand extends Command {
    async run() {
        if (!this.guild) {
            this.success = false;
            return "This command can only be used in servers.";
        }

        if (!this.database) {
            this.success = false;
            return "Database is not available.";
        }

        // Check if leveling is enabled
        const levelsEnabled = await this.database.isLevelsEnabled(this.guild.id);
        if (!levelsEnabled) {
            this.success = false;
            return "The leveling system is not enabled in this server. Ask an administrator to enable it with `/levels enable`.";
        }

        if (!this.permissions.has("EMBED_LINKS")) {
            this.success = false;
            return "I need the **Embed Links** permission to display rank information.";
        }

        // Determine which user to check
        const userOption = this.getOptionUser("user");
        let userId = this.author.id;
        let username = this.author.username;

        // Check if a user was specified via slash command or classic mention
        if (userOption) {
            userId = userOption.id;
            username = userOption.username;
        } else if (this.message && this.message.mentions.length > 0) {
            const mentionedUser = this.message.mentions[0];
            userId = mentionedUser.id;
            username = mentionedUser.username;
        }

        // Get user's level data
        const userLevel = await this.database.getUserLevel(this.guild.id, userId);
        const { xp, level } = userLevel;

        // Calculate XP needed for next level
        // Formula: level = floor(0.1 * sqrt(xp))
        // Inverse: xp = (level / 0.1)^2
        const currentLevelXP = Math.floor(Math.pow(level / 0.1, 2));
        const nextLevelXP = Math.floor(Math.pow((level + 1) / 0.1, 2));
        const xpNeeded = nextLevelXP - xp;
        const xpProgress = xp - currentLevelXP;
        const xpForLevel = nextLevelXP - currentLevelXP;

        // Get user's rank in the server
        const leaderboard = await this.database.getLeaderboard(this.guild.id, 1000);
        const rank = leaderboard.findIndex((entry) => entry.user_id === userId) + 1;

        return {
            embeds: [
                {
                    title: `📊 Rank for ${username}`,
                    color: 0x00ff00,
                    fields: [
                        {
                            name: "Level",
                            value: level.toString(),
                            inline: true,
                        },
                        {
                            name: "Total XP",
                            value: xp.toLocaleString(),
                            inline: true,
                        },
                        {
                            name: "Server Rank",
                            value: rank > 0 ? `#${rank}` : "Unranked",
                            inline: true,
                        },
                        {
                            name: "Progress to Next Level",
                            value: `${xpProgress.toLocaleString()} / ${xpForLevel.toLocaleString()} XP (${Math.floor((xpProgress / xpForLevel) * 100)}%)`,
                            inline: false,
                        },
                        {
                            name: "XP Needed",
                            value: xpNeeded.toLocaleString(),
                            inline: false,
                        },
                    ],
                    footer: {
                        text: `Earn XP by chatting! (1 minute cooldown between XP gains)`,
                    },
                },
            ],
        };
    }

    static description = "Check your or another user's level and XP";
    static aliases = ["level", "lvl"];
    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to check (defaults to yourself)",
            required: false,
        },
    ];
    static dbRequired = true;
}

export default RankCommand;
