import Command from "#cmd-classes/command.js";
import paginator from "#pagination";

class LeaderboardCommand extends Command {
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
            return "I need the **Embed Links** permission to display the leaderboard.";
        }

        // Get top users
        const leaderboard = await this.database.getLeaderboard(this.guild.id, 100);

        if (leaderboard.length === 0) {
            return {
                embeds: [
                    {
                        title: "🏆 Server Leaderboard",
                        description: "No one has earned any XP yet! Start chatting to earn XP and level up!",
                        color: 0xffd700,
                    },
                ],
            };
        }

        // Create pages with 10 users per page
        const pages = [];
        for (let i = 0; i < leaderboard.length; i += 10) {
            const pageEntries = leaderboard.slice(i, i + 10);
            const entries = await Promise.all(
                pageEntries.map(async (entry, index) => {
                    try {
                        const user = await this.client.rest.users.get(entry.user_id);
                        const rank = i + index + 1;
                        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `**${rank}.**`;
                        return `${medal} ${user.username} - Level **${entry.level}** (${entry.xp.toLocaleString()} XP)`;
                    } catch {
                        // If user can't be fetched, show their ID
                        const rank = i + index + 1;
                        return `**${rank}.** User ${entry.user_id} - Level **${entry.level}** (${entry.xp.toLocaleString()} XP)`;
                    }
                })
            );

            pages.push({
                embeds: [
                    {
                        title: "🏆 Server Leaderboard",
                        description: entries.join("\\n"),
                        color: 0xffd700,
                        footer: {
                            text: `Page ${pages.length + 1} • Total ${leaderboard.length} ranked users`,
                        },
                    },
                ],
            });
        }

        // If only one page, return directly
        if (pages.length === 1) {
            return pages[0];
        }

        // Use paginator for multiple pages
        return paginator(
            this.client,
            { message: this.message, interaction: this.interaction, author: this.author },
            pages
        );
    }

    static description = "View the server's XP leaderboard";
    static aliases = ["lb", "top"];
    static dbRequired = true;
}

export default LeaderboardCommand;
