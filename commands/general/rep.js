import Command from "#cmd-classes/command.js";

class RepCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "❌ This command can only be used in a server!";
    }

    return `⭐ **Reputation System**

Use one of the following:
• \`+rep @user [reason]\` - Give positive rep
• \`-rep @user [reason]\` - Give negative rep
• \`/rep check [@user]\` - Check rep score
• \`/rep top\` - View leaderboard
• \`/rep history\` - View recent rep received`;
  }

  static description = "Reputation system";
  static aliases = ["reputation"];
  static dbRequired = true;
}

export default RepCommand;
