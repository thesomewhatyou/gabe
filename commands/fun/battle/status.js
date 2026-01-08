import Command from "#cmd-classes/command.js";

class BattleStatusCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    // Get active battle
    const battle = await this.database.getActiveBattle(this.guild?.id ?? "");
    if (!battle) {
      return this.getString("commands.responses.battle.noBattle");
    }

    const submissions = await this.database.getSubmissions(battle.id);

    // Build status embed
    const statusEmoji = {
      submissions: "📝",
      voting: "🗳️",
      completed: "🏆",
      cancelled: "❌",
    };

    const statusText = {
      submissions: "Accepting Submissions",
      voting: "Voting in Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    let timeInfo = "";
    if (battle.status === "submissions") {
      const endTs = Math.floor(new Date(battle.submission_end).getTime() / 1000);
      timeInfo = `⏰ Submissions close <t:${endTs}:R>`;
    } else if (battle.status === "voting" && battle.voting_end) {
      const endTs = Math.floor(new Date(battle.voting_end).getTime() / 1000);
      timeInfo = `⏰ Voting ends <t:${endTs}:R>`;
    }

    // Show submissions (anonymized during voting)
    let submissionList = "";
    if (battle.status === "submissions") {
      submissionList = `**${submissions.length} submission${submissions.length !== 1 ? "s" : ""} received**`;
    } else if (battle.status === "voting") {
      submissionList = submissions.map((s, i) => `**#${i + 1}** - [View Image](${s.image_url})`).join("\n");
    }

    this.success = true;
    return {
      embeds: [
        {
          title: `${statusEmoji[battle.status]} Battle #${battle.id}: ${battle.theme}`,
          description: `**Status:** ${statusText[battle.status]}\n` + `${timeInfo}\n\n` + `${submissionList}`,
          color: battle.status === "voting" ? 0xe67e22 : 0x9b59b6,
          footer: {
            text: `Started by user ${battle.host_id}`,
          },
          timestamp: new Date(battle.created_at).toISOString(),
        },
      ],
    };
  }

  static description = "Check the status of the current battle";
  static aliases = ["battlestatus", "battleinfo"];
  static dbRequired = true;
}

export default BattleStatusCommand;
