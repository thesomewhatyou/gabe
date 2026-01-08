import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import {
  getGithubUserCache,
  setGithubUserCache,
  checkRateLimit,
  formatUser,
} from "#utils/github.js";

class GitHubUserCommand extends Command {
  async run() {
    this.success = false;
    const username = this.getOptionString("username", true);

    if (!username) {
      return "❌ Gabe says: You forgot to tell me which GitHub user to fetch!";
    }

    await this.acknowledge();

    const cacheKey = `github:user:${username}`;
    if (getGithubUserCache(cacheKey)) {
      const userData = getGithubUserCache(cacheKey);
      return formatUser(userData.userData, userData.reposData); // Note: formatUser expects (user, repos)
    }

    try {
      const headers = {
        "User-Agent": "GabeBot/1.0",
        "Accept": "application/vnd.github.v3+json",
      };

      if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const [userResponse, reposResponse] = await Promise.all([
        fetchWithFallback([`https://api.github.com/users/${username}`], { headers }),
        fetchWithFallback([`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`], { headers }),
      ]);

      checkRateLimit(userResponse);

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          return "❌ Gabe says: GitHub user not found.";
        }
        return "❌ Gabe says: Couldn't fetch user. Try again later.";
      }

      const userData = await userResponse.json();
      let reposData = [];

      if (reposResponse.ok) {
        reposData = await reposResponse.json();
      }

      setGithubUserCache(cacheKey, { userData, reposData }, 600000);
      this.success = true;
      return formatUser(userData, reposData);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "username",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "GitHub username",
      required: true,
    },
  ];

  static description = "Fetch GitHub user profile";
  static aliases = ["ghuser"];
  static category = "internet";
}

export default GitHubUserCommand;
