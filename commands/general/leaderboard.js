import LeaderboardSubCommand from "./leaderboard/leaderboard.js";

class LeaderboardCommand extends LeaderboardSubCommand {
  static description = "View the server's XP leaderboard";
  static aliases = ["lb", "top"];
}

export default LeaderboardCommand;
