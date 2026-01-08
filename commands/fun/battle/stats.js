import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BattleStatsCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    const user = this.getOptionUser("user") ?? this.author;
    const stats = await this.database.getBattleStats(this.guild?.id ?? "", user.id);

    if (stats.participations === 0) {
      if (user.id === this.author.id) {
        return this.getString("commands.responses.battle.noPersonalStats");
      }
      return this.getString("commands.responses.battle.noUserStats");
    }

    const winRate = Math.round((stats.wins / stats.participations) * 100);
    const avgVotes = Math.round((stats.total_votes_received / stats.participations) * 10) / 10;

    this.success = true;
    return {
      embeds: [
        {
          author: {
            name: `${user.username}'s Battle Stats`,
            iconURL: user.avatarURL(),
          },
          fields: [
            {
              name: "🏆 Wins",
              value: stats.wins.toString(),
              inline: true,
            },
            {
              name: "🎮 Battles",
              value: stats.participations.toString(),
              inline: true,
            },
            {
              name: "📊 Win Rate",
              value: `${winRate}%`,
              inline: true,
            },
            {
              name: "❤️ Total Votes",
              value: stats.total_votes_received.toString(),
              inline: true,
            },
            {
              name: "📈 Avg Votes/Battle",
              value: avgVotes.toString(),
              inline: true,
            },
          ],
          color: 0x9b59b6,
        },
      ],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "User to check stats for (default: yourself)",
    },
  ];

  static description = "View battle statistics for a user";
  static aliases = ["battlestats", "mystats"];
  static dbRequired = true;
}

export default BattleStatsCommand;
