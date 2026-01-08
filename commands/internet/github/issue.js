import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setGithubRepoCache, getGithubRepoCache, checkRateLimit, getHeaders } from "./repo.js";

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
            const response = await fetchWithFallback([
                `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
            ], { headers: getHeaders() });

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
    static aliases = ["issues"];
    static category = "internet";
}

export default GitHubIssueCommand;
