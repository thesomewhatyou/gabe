import { Constants } from "oceanic.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import Command from "#cmd-classes/command.js";
import { setTwitterCache, getTwitterCache, getInstances } from "./user.js";
import { parseTweetHtml } from "./tweet.js";

function parseTweetsHtml(html) {
    const tweets = [];
    const tweetRegex = /<div class="tweet[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="tweet|$)/g;
    let match;

    while ((match = tweetRegex.exec(html)) !== null) {
        const tweetHtml = match[1];
        const tweet = parseTweetHtml(tweetHtml);
        if (tweet.author || tweet.content) {
            tweets.push(tweet);
        }
    }

    return tweets.slice(0, 10);
}

function formatTweetsList(tweets, username) {
    if (tweets.length === 0) {
        return "❌ Gabe says: No tweets found.";
    }

    const fields = tweets.slice(0, 10).map((tweet) => ({
        name: `${tweet.author ? `@${tweet.author}` : "Unknown"}`,
        value: `${tweet.content.substring(0, 150)}${tweet.content.length > 150 ? "..." : ""}\n❤️ ${tweet.likes} | 🔄 ${tweet.retweets} | 💬 ${tweet.replies}`,
        inline: false,
    }));

    return {
        embeds: [
            {
                color: 0x1da1f2,
                title: `🐦 Latest tweets from @${username}`,
                fields,
                footer: { text: `Showing ${tweets.length} tweets • Twitter/X via Nitter` },
            },
        ],
    };
}

class TwitterLatestCommand extends Command {
    async run() {
        this.success = false;
        const username = this.getOptionString("username", true);
        const count = this.getOptionInteger("count") || 5;

        if (!username) {
            return "❌ Gabe says: You forgot to tell me which Twitter user to fetch!";
        }

        if (count < 1 || count > 10) {
            return "❌ Gabe says: Count must be between 1 and 10!";
        }

        await this.acknowledge();

        const cacheKey = `twitter:latest:${username}:${count}`;
        if (getTwitterCache(cacheKey)) {
            const tweets = getTwitterCache(cacheKey);
            this.success = true;
            return formatTweetsList(tweets, username);
        }

        try {
            const urls = getInstances().map((i) => `${i}/${username}/with_replies`);
            const response = await fetchWithFallback(urls);

            if (!response.ok) {
                return "❌ Gabe says: Couldn't fetch tweets. Try again later.";
            }

            const html = await response.text();
            const tweets = parseTweetsHtml(html);

            if (tweets.length === 0) {
                return "❌ Gabe says: No tweets found for that user.";
            }

            const limitedTweets = tweets.slice(0, count);
            setTwitterCache(cacheKey, limitedTweets, 180000);
            this.success = true;
            return formatTweetsList(limitedTweets, username);
        } catch (error) {
            if (error instanceof Error && error.message.includes("All instances failed")) {
                return "❌ Gabe says: All Nitter instances failed. Twitter might be having issues or instances are down. Try again later.";
            }
            return `❌ Gabe says: Something went wrong. ${error.message}`;
        }
    }

    static flags = [
        {
            name: "username",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Twitter username (without @)",
            required: true,
        },
        {
            name: "count",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Number of tweets to fetch (1-10)",
            minValue: 1,
            maxValue: 10,
        },
    ];
    static description = "Fetch latest tweets from a user";
    static aliases = [];
    static category = "internet";
}

export default TwitterLatestCommand;
export { parseTweetsHtml, formatTweetsList };
