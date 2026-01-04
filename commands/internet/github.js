import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import process from "node:process";

const githubRepoCache = new Map();
const githubUserCache = new Map();

function setGithubRepoCache(key, value, ttlMs) {
  githubRepoCache.set(key, value);
  setTimeout(() => githubRepoCache.delete(key), ttlMs);
}

function getGithubRepoCache(key) {
  return githubRepoCache.get(key);
}

function setGithubUserCache(key, value, ttlMs) {
  githubUserCache.set(key, value);
  setTimeout(() => githubUserCache.delete(key), ttlMs);
}

function getGithubUserCache(key) {
  return githubUserCache.get(key);
}

function checkRateLimit(response) {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");

  if (remaining && parseInt(remaining) < 10) {
    const resetDate = new Date(parseInt(reset!) * 1000);
    const minutesLeft = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
    console.warn(`GitHub API rate limit low: ${remaining} remaining, resets in ${minutesLeft}m`);
  }
}

class GitHubRepoCommand extends Command {
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

    const cacheKey = `github:repo:${owner}:${repo}`;
    if (getGithubRepoCache(cacheKey)) {
      const repoData = getGithubRepoCache(cacheKey);
      return formatRepo(repoData);
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "GabeBot/1.0",
        "Accept": "application/vnd.github.v3+json",
      };

      if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetchWithFallback([
        `https://api.github.com/repos/${owner}/${repo}`,
      ], { headers });

      checkRateLimit(response);

      if (!response.ok) {
        if (response.status === 404) {
          return "❌ Gabe says: Repository not found. Check the owner/repo format.";
        }
        return "❌ Gabe says: Couldn't fetch repository. Try again later.";
      }

      const repoData = await response.json();
      setGithubRepoCache(cacheKey, repoData, 600000);
      this.success = true;
      return formatRepo(repoData);
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

  static description = "Fetch GitHub repository information";
  static aliases = ["gh", "github", "repo"];
  static category = "internet";
}

function formatRepo(repo) {
  const fields = [];

  if (repo.description) {
    fields.push({ name: "📝 Description", value: repo.description, inline: false });
  }

  fields.push({ name: "⭐ Stars", value: repo.stargazers_count.toLocaleString(), inline: true });
  fields.push({ name: "🍴 Forks", value: repo.forks_count.toLocaleString(), inline: true });
  fields.push({ name: "👀 Watchers", value: repo.subscribers_count.toLocaleString(), inline: true });

  if (repo.language) {
    fields.push({ name: "💻 Language", value: repo.language, inline: true });
  }

  if (repo.license) {
    fields.push({ name: "📜 License", value: repo.license?.name || "None", inline: true });
  }

  fields.push({ name: "🐛 Open Issues", value: repo.open_issues_count.toLocaleString(), inline: true });
  fields.push({ name: "📅 Created", value: new Date(repo.created_at).toLocaleDateString(), inline: true });
  fields.push({ name: "🕐 Updated", value: new Date(repo.updated_at).toLocaleDateString(), inline: true });

  if (repo.topics && repo.topics.length > 0) {
    fields.push({ name: "🏷️ Topics", value: repo.topics.join(", "), inline: false });
  }

  return {
    embeds: [
      {
        color: 0x0d1117,
        title: `📦 ${repo.full_name}`,
        description: repo.homepage ? `[🌐 Homepage](${repo.homepage})` : "",
        url: repo.html_url,
        fields,
        footer: { text: `Open Source • GitHub` },
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
    if (getGithubUserCache(cacheKey)) {
      const userData = getGithubUserCache(cacheKey);
      return formatUser(userData);
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "GabeBot/1.0",
        "Accept": "application/vnd.github.v3+json",
      };

      if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const [userResponse, reposResponse] = await Promise.all([
        fetchWithFallback([`https://api.github.com/users/${username}`, { headers }),
        fetchWithFallback([`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`, { headers }),
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

function formatUser(user, repos) {
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
    const repoList = repos.map((repo) => {
      const stars = repo.stargazers_count || 0;
      return `⭐ ${stars} | [${repo.name}](${repo.html_url})`;
    }).join("\n");

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
      const headers: Record<string, string> = {
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

function formatIssue(issue) {
  const fields = [];

  fields.push({ name: "👤 Author", value: `@${issue.user?.login}`, inline: true });
  fields.push({ name: "📊 State", value: issue.state.toUpperCase(), inline: true });
  fields.push({ name: "💬 Comments", value: issue.comments.toLocaleString(), inline: true });

  const createdDate = new Date(issue.created_at);
  fields.push({ name: "📅 Created", value: createdDate.toLocaleString(), inline: true });

  if (issue.closed_at) {
    const closedDate = new Date(issue.closed_at);
    fields.push({ name: "🕐 Closed", value: closedDate.toLocaleString(), inline: true });
  }

  if (issue.labels && issue.labels.length > 0) {
    const labels = issue.labels.map((l) => l.name).join(", ");
    fields.push({ name: "🏷️ Labels", value: labels, inline: false });
  }

  if (issue.assignees && issue.assignees.length > 0) {
    const assignees = issue.assignees.map((a) => `@${a.login}`).join(", ");
    fields.push({ name: "👤 Assignees", value: assignees, inline: false });
  }

  let description = issue.body || "No description";

  if (description.length > 2000) {
    description = description.substring(0, 2000) + "\n\n... (truncated)";
  }

  return {
    embeds: [
      {
        color: issue.state === "open" ? 0x2ea043 : 0x6f42c1,
        title: `🐛 ${issue.title}`,
        description,
        url: issue.html_url,
        fields,
        footer: { text: `#${issue.number} • GitHub` },
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
      const headers: Record<string, string> = {
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
      const headers: Record<string, string> = {
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

function formatSearchResults(repos, query) {
  if (repos.length === 0) {
    return "❌ Gabe says: No repositories found.";
  }

  const fields = repos.slice(0, 10).map((repo) => ({
    name: repo.full_name,
    value: `⭐ ${repo.stargazers_count.toLocaleString()} | 🍴 ${repo.forks_count.toLocaleString()}\n💻 ${repo.language || "Unknown"}\n📝 ${repo.description?.substring(0, 100) || "No description"}`,
    inline: false,
  }));

  return {
    embeds: [
      {
        color: 0x0d1117,
        title: `🔍 Search results for "${query}"`,
        fields,
        footer: { text: `Showing ${repos.length} results • GitHub` },
      },
    ],
  };
}

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
      const headers: Record<string, string> = {
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

function formatReadme(readme, owner, repo) {
  if (!readme.content) {
    return "❌ Gabe says: No README found in this repository.";
  }

  const content = Buffer.from(readme.content, "base64").toString("utf-8");

  if (content.length <= 2000) {
    return {
      embeds: [
        {
          color: 0x0d1117,
          title: `📄 README - ${owner}/${repo}`,
          description: content.substring(0, 2000),
          url: readme.html_url,
          footer: { text: "GitHub" },
        },
      ],
    };
  }

  const truncatedContent = content.substring(0, 1950) + "\n\n... (truncated)";
  return `# README: ${owner}/${repo}\n\n\`\`\`markdown\n${truncatedContent}\n\`\`\``;
}

export {
  GitHubRepoCommand,
  GitHubUserCommand,
  GitHubIssueCommand,
  GitHubPRCommand,
  GitHubSearchCommand,
  GitHubReadmeCommand,
};
