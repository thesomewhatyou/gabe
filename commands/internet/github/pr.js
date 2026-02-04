import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setGithubRepoCache, getGithubRepoCache, checkRateLimit, getHeaders } from "./repo.js";

function formatPR(pr) {
  const fields = [];

  fields.push({ name: "👤 Author", value: `@${pr.user?.login}`, inline: true });
  fields.push({ name: "📊 Status", value: pr.state.toUpperCase(), inline: true });
  fields.push({ name: "🔀 Merged", value: pr.merged ? "Yes" : "No", inline: true });

  const createdDate = new Date(pr.created_at);
  fields.push({ name: "📅 Created", value: createdDate.toLocaleString(), inline: true });

  if (pr.closed_at) {
    const closedDate = new Date(pr.closed_at);
    fields.push({ name: "🕐 Closed", value: closedDate.toLocaleString(), inline: true });
  }

  if (pr.merged_at) {
    const mergedDate = new Date(pr.merged_at);
    fields.push({ name: "✅ Merged", value: mergedDate.toLocaleString(), inline: true });
  }

  if (pr.additions !== undefined) {
    fields.push({ name: "+ Additions", value: `+${pr.additions.toLocaleString()}`, inline: true });
  }

  if (pr.deletions !== undefined) {
    fields.push({ name: "- Deletions", value: `-${pr.deletions.toLocaleString()}`, inline: true });
  }

  if (pr.changed_files !== undefined) {
    fields.push({ name: "📁 Files Changed", value: pr.changed_files.toLocaleString(), inline: true });
  }

  if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
    const reviewers = pr.requested_reviewers.map((r) => `@${r.login}`).join(", ");
    fields.push({ name: "👀 Requested Reviewers", value: reviewers, inline: false });
  }

  let description = pr.body || "No description";

  if (description.length > 2000) {
    description = description.substring(0, 2000) + "\n\n... (truncated)";
  }

  const color = pr.merged ? 0xa371f7 : pr.state === "open" ? 0x2ea043 : 0xf85149;

  return {
    embeds: [
      {
        color,
        title: `🔀 ${pr.title}`,
        description,
        url: pr.html_url,
        fields,
        footer: { text: `#${pr.number} • GitHub` },
      },
    ],
  };
}

class GitHubPRCommand extends Command {
  async run() {
    this.success = false;
    const input = this.getOptionString("pr", true);

    if (!input) {
      return "❌ Gabe says: You forgot to tell me which PR to fetch!";
    }

    await this.acknowledge();

    const prMatch = input.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
    if (!prMatch) {
      return "❌ Gabe says: Invalid format. Use: owner/repo#123 (e.g., facebook/react#1234)";
    }

    const owner = prMatch[1];
    const repo = prMatch[2];
    const prNumber = prMatch[3];

    const cacheKey = `github:pr:${owner}:${repo}:${prNumber}`;
    if (getGithubRepoCache(cacheKey)) {
      const prData = getGithubRepoCache(cacheKey);
      return formatPR(prData);
    }

    try {
      const response = await fetchWithFallback([`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`], {
        headers: getHeaders(),
      });

      checkRateLimit(response);

      if (!response.ok) {
        if (response.status === 404) {
          return "❌ Gabe says: Pull request not found.";
        }
        return "❌ Gabe says: Couldn't fetch PR. Try again later.";
      }

      const prData = await response.json();
      setGithubRepoCache(cacheKey, prData, 300000);
      this.success = true;
      return formatPR(prData);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "pr",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Pull request (owner/repo#123 format)",
      required: true,
    },
  ];

  static description = "Fetch GitHub pull request details";
  static aliases = ["pullrequest", "pull"];
  static category = "internet";
}

export default GitHubPRCommand;
