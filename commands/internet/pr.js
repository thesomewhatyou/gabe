import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import {
  getGithubRepoCache,
  setGithubRepoCache,
  checkRateLimit,
  formatPR,
} from "#utils/github.js";

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
      const headers = {
        "User-Agent": "GabeBot/1.0",
        "Accept": "application/vnd.github.v3+json",
      };

      if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetchWithFallback([
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      ], { headers });

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
  static aliases = ["pr", "pullrequest"];
  static category = "internet";
}

export default GitHubPRCommand;
