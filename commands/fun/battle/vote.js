import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BattleVoteCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    // Get active battle
    const battle = await this.database.getActiveBattle(this.guild?.id ?? "");
    if (!battle) {
      return this.getString("commands.responses.battle.noBattle");
    }

    if (battle.status !== "voting") {
      if (battle.status === "submissions") {
        return this.getString("commands.responses.battle.votingNotStarted");
      }
      return this.getString("commands.responses.battle.votingEnded");
    }

    // Check if voting period has ended
    if (battle.voting_end) {
      const votingEnd = new Date(battle.voting_end);
      if (Date.now() > votingEnd.getTime()) {
        return this.getString("commands.responses.battle.votingEnded");
      }
    }

    // Check if user already voted
    if (await this.database.hasVoted(battle.id, this.author.id)) {
      return this.getString("commands.responses.battle.alreadyVoted");
    }

    // Get submission number
    const submissionNum = this.getOptionNumber("submission") ?? Number.parseInt(this.args[0], 10);
    if (!submissionNum || Number.isNaN(submissionNum)) {
      return this.getString("commands.responses.battle.invalidSubmission");
    }

    // Get all submissions
    const submissions = await this.database.getSubmissions(battle.id);
    if (submissionNum < 1 || submissionNum > submissions.length) {
      return this.getString("commands.responses.battle.invalidSubmission");
    }

    const selectedSubmission = submissions[submissionNum - 1];

    // Can't vote for yourself
    if (selectedSubmission.user_id === this.author.id) {
      return this.getString("commands.responses.battle.noSelfVote");
    }

    // Add vote
    await this.database.addVote(battle.id, this.author.id, selectedSubmission.id);

    this.success = true;
    return {
      content: `✅ You voted for submission #${submissionNum}!`,
      flags: 64, // Ephemeral
    };
  }

  static flags = [
    {
      name: "submission",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "The submission number to vote for",
      required: true,
      min_value: 1,
      classic: true,
    },
  ];

  static description = "Vote for your favorite submission";
  static aliases = ["battlevote"];
  static dbRequired = true;
}

export default BattleVoteCommand;
