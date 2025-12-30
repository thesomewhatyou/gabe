import Command from "#cmd-classes/command.js";

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

        const enabled = await this.database.isEconomyEnabled(this.guild.id);
        if (!enabled) {
            this.success = false;
            return "💰 The economy system is not enabled in this server.";
        }

        // Get leaderboard
        const leaderboard = await this.database.getEconomyLeaderboard(this.guild.id, 10);

        if (leaderboard.length === 0) {
            return "📊 No one has any GabeCoins yet! Start earning with `/economy daily` or `/economy work`.";
        }

        const medals = ["🥇", "🥈", "🥉"];
        const lines = leaderboard.map((entry, index) => {
            const medal = medals[index] ?? `**${index + 1}.**`;
            return `${medal} <@${entry.user_id}> - **${entry.balance.toLocaleString()}** 🪙`;
        });

        return {
            embeds: [
                {
                    title: "🏆 GabeCoin Leaderboard",
                    description: lines.join("\n"),
                    color: 0xffd700,
                    footer: {
                        text: "Top 10 richest members",
                    },
                    timestamp: new Date().toISOString(),
                },
            ],
        };
    }

    static description = "View the richest members in the server";
    static aliases = ["lb", "top", "rich"];
    static dbRequired = true;
}

export default LeaderboardCommand;
