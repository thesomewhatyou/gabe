import RankSubCommand from "./rank/rank.js";

class RankCommand extends RankSubCommand {
    static description = "Check your or another user's level and XP";
    static aliases = ["level", "lvl"];
}

export default RankCommand;
