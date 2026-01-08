import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setGithubRepoCache, getGithubRepoCache, checkRateLimit, getHeaders } from "./repo.js";

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
            const response = await fetchWithFallback([
                `https://api.github.com/repos/${owner}/${repo}/readme`,
            ], { headers: getHeaders() });

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
    static aliases = [];
    static category = "internet";
}

export default GitHubReadmeCommand;
