import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BattleLeaderboardCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    const limit = this.getOptionInteger("limit") ?? 10;
    if (limit < 1 || limit > 25) {
      this.success = false;
      return "Battle leaderboard limit must be between 1 and 25.";
    }
    const leaderboard = await this.database.getBattleLeaderboard(this.guild?.id ?? "", limit);

    if (leaderboard.length === 0) {
      return this.getString("commands.responses.battle.noStats");
    }

    const medals = ["🥇", "🥈", "🥉"];
    const entries = leaderboard.map((entry, i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      const winRate = entry.participations > 0 ? Math.round((entry.wins / entry.participations) * 100) : 0;
      return `${medal} <@${entry.user_id}> - **${entry.wins}** wins (${winRate}% win rate, ${entry.total_votes_received} total votes)`;
    });

    this.success = true;
    return {
      embeds: [
        {
          title: "🏆 Battle Leaderboard",
          description: entries.join("\n"),
          color: 0xf1c40f,
          footer: {
            text: `Top ${leaderboard.length} battlers in this server`,
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "limit",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Number of users to show (default: 10)",
      minValue: 1,
      maxValue: 25,
    },
  ];

  static description = "View the battle leaderboard for this server";
  static aliases = ["battleleaderboard", "battletop", "battleranks"];
  static dbRequired = true;
}

export default BattleLeaderboardCommand;
