import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setGithubRepoCache, getGithubRepoCache, checkRateLimit, getHeaders } from "./repo.js";

function formatUser(user, repos = []) {
  const fields = [];

  if (user.bio) {
    fields.push({ name: "📝 Bio", value: user.bio, inline: false });
  }

  if (user.location) {
    fields.push({ name: "📍 Location", value: user.location, inline: true });
  }

  if (user.company) {
    fields.push({ name: "🏢 Company", value: user.company, inline: true });
  }

  if (user.blog) {
    fields.push({ name: "🌐 Website", value: user.blog, inline: true });
  }

  fields.push({ name: "👥 Followers", value: user.followers.toLocaleString(), inline: true });
  fields.push({ name: "👣 Following", value: user.following.toLocaleString(), inline: true });
  fields.push({ name: "📦 Repos", value: user.public_repos.toLocaleString(), inline: true });

  const createdDate = new Date(user.created_at);
  fields.push({ name: "📅 Joined", value: createdDate.toLocaleDateString(), inline: true });

  if (repos.length > 0) {
    const repoList = repos
      .map((repo) => {
        const stars = repo.stargazers_count || 0;
        return `⭐ ${stars} | [${repo.name}](${repo.html_url})`;
      })
      .join("\n");

    fields.push({ name: "📦 Top Repos", value: repoList, inline: false });
  }

  return {
    embeds: [
      {
        color: 0x0d1117,
        title: `👤 ${user.name || user.login}`,
        description: user.bio || "No bio available",
        thumbnail: { url: user.avatar_url },
        url: user.html_url,
        fields,
        footer: { text: `GitHub` },
      },
    ],
  };
}

class GitHubUserCommand extends Command {
  async run() {
    this.success = false;
    const username = this.getOptionString("username", true);

    if (!username) {
      return "❌ Gabe says: You forgot to tell me which GitHub user to fetch!";
    }

    await this.acknowledge();

    const cacheKey = `github:user:${username}`;
    if (getGithubRepoCache(cacheKey)) {
      const { userData, reposData } = getGithubRepoCache(cacheKey);
      return formatUser(userData, reposData);
    }

    try {
      const headers = getHeaders();
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

      setGithubRepoCache(cacheKey, { userData, reposData }, 600000);
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
  static aliases = ["ghuser", "profile"];
  static category = "internet";
}

export default GitHubUserCommand;
