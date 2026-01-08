import { fetchWithFallback } from "#utils/apifetch.js";

const githubRepoCache = new Map();
const githubUserCache = new Map();

export function setGithubRepoCache(key, value, ttlMs) {
  githubRepoCache.set(key, value);
  setTimeout(() => githubRepoCache.delete(key), ttlMs);
}

export function getGithubRepoCache(key) {
  return githubRepoCache.get(key);
}

export function setGithubUserCache(key, value, ttlMs) {
  githubUserCache.set(key, value);
  setTimeout(() => githubUserCache.delete(key), ttlMs);
}

export function getGithubUserCache(key) {
  return githubUserCache.get(key);
}

export function checkRateLimit(response) {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");

  if (remaining && parseInt(remaining) < 10) {
    const resetDate = new Date(parseInt(reset) * 1000);
    const minutesLeft = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
    console.warn(`GitHub API rate limit low: ${remaining} remaining, resets in ${minutesLeft}m`);
  }
}

export function formatRepo(repo) {
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
        footer: { text: "Open Source • GitHub" },
      },
    ],
  };
}

export function formatUser(user, repos) {
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

  if (repos && repos.length > 0) {
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
        footer: { text: "GitHub" },
      },
    ],
  };
}

export function formatIssue(issue) {
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

export function formatPR(pr) {
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

export function formatSearchResults(repos, query) {
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

export function formatReadme(readme, owner, repo) {
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
