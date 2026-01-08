import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import {
  getGithubRepoCache,
  setGithubRepoCache,
  checkRateLimit,
  formatIssue,
} from "#utils/github.js";

class GitHubIssueCommand extends Command {
  async run() {
    this.success = false;
    const input = this.getOptionString("issue", true);

    if (!input) {
      return "❌ Gabe says: You forgot to tell me which issue to fetch!";
    }

    await this.acknowledge();

    const issueMatch = input.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
    if (!issueMatch) {
      return "❌ Gabe says: Invalid format. Use: owner/repo#123 (e.g., facebook/react#1234)";
    }

    const owner = issueMatch[1];
    const repo = issueMatch[2];
    const issueNumber = issueMatch[3];

    const cacheKey = `github:issue:${owner}:${repo}:${issueNumber}`;
    if (getGithubRepoCache(cacheKey)) {
      const issueData = getGithubRepoCache(cacheKey);
      return formatIssue(issueData);
    }

    try {
      const headers = {
        "User-Agent": "GabeBot/1.0",
        "Accept": "application/vnd.github.v3+json",
      };

      if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetchWithFallback([
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      ], { headers });

      checkRateLimit(response);

      if (!response.ok) {
        if (response.status === 404) {
          return "❌ Gabe says: Issue not found.";
        }
        return "❌ Gabe says: Couldn't fetch issue. Try again later.";
      }

      const issueData = await response.json();
      setGithubRepoCache(cacheKey, issueData, 300000);
      this.success = true;
      return formatIssue(issueData);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "issue",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Issue (owner/repo#123 format)",
      required: true,
    },
  ];

  static description = "Fetch GitHub issue details";
  static aliases = ["issue"];
  static category = "internet";
}

export default GitHubIssueCommand;
