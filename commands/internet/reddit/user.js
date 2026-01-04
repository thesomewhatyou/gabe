import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setRedditCache, getRedditCache } from "./post.js";

function formatUser(user, username) {
    const createdDate = new Date(user.data.created_utc * 1000);
    const accountAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const fields = [];

    fields.push({ name: "🍰 Cake Day", value: createdDate.toLocaleDateString(), inline: true });
    fields.push({ name: "📅 Account Age", value: `${accountAge} days`, inline: true });
    fields.push({ name: "⬆️ Link Karma", value: user.data.link_karma.toLocaleString(), inline: true });
    fields.push({ name: "💬 Comment Karma", value: user.data.comment_karma.toLocaleString(), inline: true });
    fields.push({ name: "👥 Total Karma", value: (user.data.link_karma + user.data.comment_karma).toLocaleString(), inline: true });

    return {
        embeds: [
            {
                color: 0xff4500,
                title: `👤 u/${username}`,
                description: user.data.subreddit?.title || "",
                thumbnail: { url: user.data.snoovatar_img || "" },
                fields,
                url: `https://www.reddit.com/user/${username}`,
                footer: { text: "Reddit" },
            },
        ],
    };
}

class RedditUserCommand extends Command {
    async run() {
        this.success = false;
        const username = this.getOptionString("username", true);

        if (!username) {
            return "❌ Gabe says: You forgot to tell me which Reddit user to fetch!";
        }

        await this.acknowledge();

        const cacheKey = `reddit:user:${username}`;
        if (getRedditCache(cacheKey)) {
            const userData = getRedditCache(cacheKey);
            this.success = true;
            return formatUser(userData, username);
        }

        try {
            const response = await fetchWithFallback([`https://www.reddit.com/user/${username}/about.json`]);

            if (!response.ok) {
                return "❌ Gabe says: Couldn't fetch that Reddit user. Try again later.";
            }

            const userData = await response.json();

            if (!userData || !userData.data) {
                return "❌ Gabe says: Couldn't find that Reddit user.";
            }

            setRedditCache(cacheKey, userData, 300000);
            this.success = true;
            return formatUser(userData, username);
        } catch (error) {
            return `❌ Gabe says: Something went wrong. ${error.message}`;
        }
    }

    static flags = [
        {
            name: "username",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Reddit username (without u/)",
            required: true,
        },
    ];

    static description = "Fetch Reddit user profile";
    static aliases = ["profile"];
    static category = "internet";
}

export default RedditUserCommand;
