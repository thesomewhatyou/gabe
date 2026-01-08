import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import {
  getGithubRepoCache,
  setGithubRepoCache,
  checkRateLimit,
  formatReadme,
} from "#utils/github.js";

class GitHubReadmeCommand extends Command {
  async run() {
    this.success = false;
    const input = this.getOptionString("repo", true);

    if (!input) {
      return "❌ Gabe says: You forgot to tell me which repository to fetch!";
    }

    await this.acknowledge();

    const repoMatch = input.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (!repoMatch) {
      return "❌ Gabe says: Invalid repository format. Use: owner/repo (e.g., facebook/react)";
    }

    const owner = repoMatch[1];
    const repo = repoMatch[2];

    const cacheKey = `github:readme:${owner}:${repo}`;
    if (getGithubRepoCache(cacheKey)) {
      const readmeData = getGithubRepoCache(cacheKey);
      this.success = true;
      return formatReadme(readmeData, owner, repo);
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
        `https://api.github.com/repos/${owner}/${repo}/readme`,
      ], { headers });

      checkRateLimit(response);

      if (!response.ok) {
        if (response.status === 404) {
          return "❌ Gabe says: Repository or README not found.";
        }
        return "❌ Gabe says: Couldn't fetch README. Try again later.";
      }

      const readmeData = await response.json();
      setGithubRepoCache(cacheKey, readmeData, 600000);
      this.success = true;
      return formatReadme(readmeData, owner, repo);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "repo",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Repository (owner/repo format)",
      required: true,
    },
  ];

  static description = "Fetch GitHub repository README";
  static aliases = ["readme"];
  static category = "internet";
}

export default GitHubReadmeCommand;
