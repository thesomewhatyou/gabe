/**
 * Battle Scheduler
 *
 * Handles automatic phase transitions for image battles.
 * Checks periodically for battles that need to transition from
 * submissions -> voting or voting -> completed.
 */

import type { Client } from "oceanic.js";
import type { DatabasePlugin } from "../database.ts";
import logger from "./logger.ts";

const CHECK_INTERVAL = 60 * 1000; // Check every minute

let intervalId: NodeJS.Timeout | null = null;

export async function startBattleScheduler(client: Client, database: DatabasePlugin | undefined) {
  if (!database) {
    logger.warn("Battle scheduler: No database available, skipping initialization");
    return;
  }

  if (intervalId) {
    logger.warn("Battle scheduler already running");
    return;
  }

  logger.info("Starting battle scheduler...");

  intervalId = setInterval(async () => {
    try {
      await checkBattlePhases(client, database);
    } catch (e) {
      logger.error(`Battle scheduler error: ${e}`);
    }
  }, CHECK_INTERVAL);

  // Run immediately on start
  await checkBattlePhases(client, database);
}

export function stopBattleScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Battle scheduler stopped");
  }
}

async function checkBattlePhases(client: Client, database: DatabasePlugin) {
  // This is a simplified check - in production you'd want to iterate all guilds
  // For now, we rely on commands to handle transitions
  // A more robust implementation would query all active battles and check their times

  // Note: The actual transition logic happens in the battle commands
  // This scheduler could be extended to:
  // 1. Query all battles with status='submissions' where submission_end < NOW()
  // 2. Auto-transition them to voting phase
  // 3. Query all battles with status='voting' where voting_end < NOW()
  // 4. Auto-complete them and announce winners

  // For now, keeping it simple - users must use /battle end to transition
  void client;
  void database;
}

/**
 * Check if a specific battle needs phase transition
 * Called when a command is run to ensure proper state
 */
export async function checkBattleTransition(
  _client: Client,
  database: DatabasePlugin,
  guildId: string,
): Promise<{ transitioned: boolean; message?: string }> {
  const battle = await database.getActiveBattle(guildId);
  if (!battle) return { transitioned: false };

  const now = Date.now();

  // Check if submissions phase should end
  if (battle.status === "submissions") {
    const submissionEnd = new Date(battle.submission_end).getTime();
    if (now > submissionEnd) {
      const submissions = await database.getSubmissions(battle.id);

      if (submissions.length < 2) {
        // Not enough submissions, cancel battle
        await database.updateBattleStatus(battle.id, "cancelled");
        return {
          transitioned: true,
          message: `❌ Battle #${battle.id} cancelled - not enough submissions (${submissions.length}/2 minimum)`,
        };
      }

      // Transition to voting phase (30 minutes)
      const votingEnd = new Date(now + 30 * 60 * 1000).toISOString();
      await database.updateBattleStatus(battle.id, "voting", votingEnd);

      // Build gallery
      const gallery = submissions.map((s, i) => `**#${i + 1}** - [View Image](${s.image_url})`).join("\n");

      const votingEndTs = Math.floor(new Date(votingEnd).getTime() / 1000);

      return {
        transitioned: true,
        message:
          `🗳️ **Voting has begun for Battle #${battle.id}!**\n\n` +
          `**Theme:** ${battle.theme}\n\n` +
          `**Submissions:**\n${gallery}\n\n` +
          `Vote using \`/battle vote <number>\`\n` +
          `⏰ Voting ends <t:${votingEndTs}:R>`,
      };
    }
  }

  // Check if voting phase should end
  if (battle.status === "voting" && battle.voting_end) {
    const votingEnd = new Date(battle.voting_end).getTime();
    if (now > votingEnd) {
      const submissions = await database.getSubmissions(battle.id);
      const voteCounts = await database.getVoteCounts(battle.id);

      if (voteCounts.length === 0 || voteCounts[0].votes === 0) {
        await database.updateBattleStatus(battle.id, "completed");
        return {
          transitioned: true,
          message: `❌ Battle #${battle.id} ended with no votes. No winner declared.`,
        };
      }

      // Find winner
      const winningSubmissionId = voteCounts[0].submission_id;
      const winningSubmission = submissions.find((s) => s.id === winningSubmissionId);

      if (!winningSubmission) {
        await database.updateBattleStatus(battle.id, "completed");
        return { transitioned: true, message: "Error determining winner." };
      }

      // Update stats
      await database.setBattleWinner(battle.id, winningSubmission.user_id);
      for (const submission of submissions) {
        const votes = voteCounts.find((v) => v.submission_id === submission.id)?.votes ?? 0;
        await database.updateBattleStats(
          battle.guild_id,
          submission.user_id,
          submission.id === winningSubmissionId,
          votes,
        );
      }

      // Build results
      const results = submissions
        .map((s) => {
          const votes = voteCounts.find((v) => v.submission_id === s.id)?.votes ?? 0;
          const medal = s.id === winningSubmissionId ? "🥇" : "";
          return { oderId: s.user_id, votes, medal };
        })
        .sort((a, b) => b.votes - a.votes)
        .map((r, i) => `${r.medal || `#${i + 1}`} <@${r.oderId}> - **${r.votes} vote${r.votes !== 1 ? "s" : ""}**`)
        .join("\n");

      return {
        transitioned: true,
        message:
          `🏆 **Battle #${battle.id} Complete!**\n\n` +
          `**Theme:** ${battle.theme}\n\n` +
          `**Winner:** <@${winningSubmission.user_id}>! 🎉\n\n` +
          `**Results:**\n${results}`,
      };
    }
  }

  return { transitioned: false };
}
