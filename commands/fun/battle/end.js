import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BattleEndCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    // Get active battle
    const battle = await this.database.getActiveBattle(this.guild?.id ?? "");
    if (!battle) {
      return this.getString("commands.responses.battle.noBattle");
    }

    // Only host or admin can end battle
    const isHost = battle.host_id === this.author.id;
    const isAdmin = this.memberPermissions.has("MANAGE_GUILD");
    if (!isHost && !isAdmin) {
      return this.getString("commands.responses.battle.notHost");
    }

    const force = this.getOptionBoolean("force") ?? false;

    // If in submissions phase, transition to voting
    if (battle.status === "submissions") {
      const submissions = await this.database.getSubmissions(battle.id);

      if (submissions.length < 2 && !force) {
        return this.getString("commands.responses.battle.notEnoughSubmissions");
      }

      if (submissions.length === 0) {
        // Cancel if no submissions
        await this.database.updateBattleStatus(battle.id, "cancelled");
        this.success = true;
        return "❌ Battle cancelled - no submissions received.";
      }

      // Start voting phase (30 minutes by default)
      const votingEnd = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await this.database.updateBattleStatus(battle.id, "voting", votingEnd);

      const votingEndTs = Math.floor(new Date(votingEnd).getTime() / 1000);

      // Build gallery of submissions
      const gallery = submissions.map((s, i) => `**#${i + 1}** - [View Image](${s.image_url})`).join("\n");

      this.success = true;
      return {
        embeds: [
          {
            title: "🗳️ Voting Has Begun!",
            description:
              `**Theme:** ${battle.theme}\n\n` +
              `Vote for your favorite using \`/battle vote <number>\`!\n\n` +
              `**Submissions:**\n${gallery}\n\n` +
              `⏰ **Voting ends:** <t:${votingEndTs}:R>`,
            color: 0xe67e22,
            footer: {
              text: `Battle #${battle.id} • ${submissions.length} submissions`,
            },
          },
        ],
      };
    }

    // If in voting phase, end and announce winner
    if (battle.status === "voting") {
      const submissions = await this.database.getSubmissions(battle.id);
      const voteCounts = await this.database.getVoteCounts(battle.id);

      if (voteCounts.length === 0 || voteCounts[0].votes === 0) {
        await this.database.updateBattleStatus(battle.id, "completed");
        this.success = true;
        return "❌ Battle ended - no votes received. No winner declared.";
      }

      // Find winner (highest votes)
      const winningSubmissionId = voteCounts[0].submission_id;
      const winningSubmission = submissions.find((s) => s.id === winningSubmissionId);

      if (!winningSubmission) {
        await this.database.updateBattleStatus(battle.id, "completed");
        return "Error determining winner.";
      }

      // Update battle with winner
      await this.database.setBattleWinner(battle.id, winningSubmission.user_id);

      // Update stats for all participants
      for (const submission of submissions) {
        const votes = voteCounts.find((v) => v.submission_id === submission.id)?.votes ?? 0;
        const won = submission.id === winningSubmissionId;
        await this.database.updateBattleStats(battle.guild_id, submission.user_id, won, votes);
      }

      // Build results
      const results = submissions
        .map((s) => {
          const votes = voteCounts.find((v) => v.submission_id === s.id)?.votes ?? 0;
          const medal = s.id === winningSubmissionId ? "🥇" : "";
          return { ...s, votes, medal };
        })
        .sort((a, b) => b.votes - a.votes)
        .map((s, i) => `${s.medal || `#${i + 1}`} <@${s.user_id}> - **${s.votes} vote${s.votes !== 1 ? "s" : ""}**`)
        .join("\n");

      this.success = true;
      return {
        embeds: [
          {
            title: "🏆 Battle Complete!",
            description:
              `**Theme:** ${battle.theme}\n\n` +
              `**Winner:** <@${winningSubmission.user_id}>! 🎉\n\n` +
              `**Results:**\n${results}`,
            image: { url: winningSubmission.image_url },
            color: 0xf1c40f,
            footer: {
              text: `Battle #${battle.id}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    return "Battle is already completed or cancelled.";
  }

  static flags = [
    {
      name: "force",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      description: "Force end even with few submissions",
    },
  ];

  static description = "End submissions and start voting, or end voting and declare winner";
  static aliases = ["battleend", "endbattle"];
  static dbRequired = true;
}

export default BattleEndCommand;
