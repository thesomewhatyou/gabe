import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import {
  getGithubRepoCache,
  setGithubRepoCache,
  checkRateLimit,
  formatSearchResults,
} from "#utils/github.js";

class GitHubSearchCommand extends Command {
  async run() {
    this.success = false;
    const query = this.getOptionString("query", true);

    if (!query) {
      return "❌ Gabe says: You forgot to tell me what to search for!";
    }

    await this.acknowledge();

    const cacheKey = `github:search:${encodeURIComponent(query)}`;
    if (getGithubRepoCache(cacheKey)) {
      const repos = getGithubRepoCache(cacheKey);
      this.success = true;
      return formatSearchResults(repos, query);
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
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
      ], { headers });

      checkRateLimit(response);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't search GitHub. Try again later.";
      }

      const data = await response.json();

      if (!data || !data.items || data.items.length === 0) {
        return "❌ Gabe says: No repositories found.";
      }

      const repos = data.items;
      setGithubRepoCache(cacheKey, repos, 300000);
      this.success = true;
      return formatSearchResults(repos, query);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "query",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Search query",
      required: true,
    },
  ];

  static description = "Search GitHub repositories";
  static aliases = ["ghsearch"];
  static category = "internet";
}

export default GitHubSearchCommand;
