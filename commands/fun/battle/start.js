import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BattleStartCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    // Check if there's already an active battle
    const activeBattle = await this.database.getActiveBattle(this.guild?.id ?? "");
    if (activeBattle) {
      return this.getString("commands.responses.battle.alreadyActive");
    }

    const theme = this.getOptionString("theme") ?? this.args.join(" ");
    if (!theme) {
      return this.getString("commands.responses.battle.noTheme");
    }

    const duration = this.getOptionNumber("duration") ?? 30;

    // Create the battle
    const battle = await this.database.createBattle(
      this.guild?.id ?? "",
      this.channel.id,
      this.author.id,
      theme,
      duration,
    );

    // Calculate end time
    const submissionEndTimestamp = Math.floor(new Date(battle.submission_end).getTime() / 1000);

    this.success = true;
    return {
      embeds: [
        {
          title: "🎨 Image Battle Started!",
          description:
            `**Theme:** ${theme}\n\n` +
            `Submit your best edited image using \`/battle submit\`!\n\n` +
            `⏰ **Submissions close:** <t:${submissionEndTimestamp}:R>\n\n` +
            `📝 **Rules:**\n` +
            `• One submission per person\n` +
            `• Must be an image you edited/created\n` +
            `• Voting begins after submissions close`,
          color: 0x9b59b6,
          footer: {
            text: `Battle #${battle.id} • Started by ${this.author.username}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  static flags = [
    {
      name: "theme",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The theme/prompt for the battle",
      required: true,
      classic: true,
    },
    {
      name: "duration",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Submission time in minutes (default: 30)",
      min_value: 5,
      max_value: 120,
    },
  ];

  static description = "Start a new image editing battle";
  static aliases = ["battlestart", "newbattle"];
  static dbRequired = true;
}

export default BattleStartCommand;
