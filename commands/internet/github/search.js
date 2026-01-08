import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setGithubRepoCache, getGithubRepoCache, checkRateLimit, getHeaders } from "./repo.js";

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
            const response = await fetchWithFallback([
                `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
            ], { headers: getHeaders() });

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
    static aliases = ["find"];
    static category = "internet";
}

export default GitHubSearchCommand;
