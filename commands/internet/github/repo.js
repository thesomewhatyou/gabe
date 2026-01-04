import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";

const githubRepoCache = new Map();

function setGithubRepoCache(key, value, ttlMs) {
    githubRepoCache.set(key, value);
    setTimeout(() => githubRepoCache.delete(key), ttlMs);
}

function getGithubRepoCache(key) {
    return githubRepoCache.get(key);
}

function checkRateLimit(response) {
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");

    if (remaining && parseInt(remaining) < 10) {
        const resetDate = new Date(parseInt(reset) * 1000);
        const minutesLeft = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
        console.warn(`GitHub API rate limit low: ${remaining} remaining, resets in ${minutesLeft}m`);
    }
}

function getHeaders() {
    const headers = {
        "User-Agent": "GabeBot/1.0",
        "Accept": "application/vnd.github.v3+json",
    };

    if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
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
            const response = await fetchWithFallback([
                `https://api.github.com/repos/${owner}/${repo}`,
            ], { headers: getHeaders() });

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
    static aliases = ["repository"];
    static category = "internet";
}

export default GitHubRepoCommand;
export { setGithubRepoCache, getGithubRepoCache, checkRateLimit, getHeaders };
