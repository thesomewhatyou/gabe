import Command from "#cmd-classes/command.js";

class RepTopCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    const leaderboard = await this.database.getRepLeaderboard(this.guild.id, 10);

    if (leaderboard.length === 0) {
      this.success = true;
      return "📊 No reputation data yet. Be the first to give rep with `+rep @user`!";
    }

    let response = "🏆 **Reputation Leaderboard**\n\n";

    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
      const score = typeof entry.total === "string" ? parseInt(entry.total) : entry.total;
      const sign = score > 0 ? "+" : "";
      response += `${medal} <@${entry.user_id}> — ${sign}${score}\n`;
    }

    this.success = true;
    return response;
  }

  static description = "View the reputation leaderboard";
  static aliases = ["leaderboard", "lb"];
  static dbRequired = true;
}

export default RepTopCommand;
