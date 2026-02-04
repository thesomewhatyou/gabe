import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { parseTweetHtml } from "./tweet.js";
import { setTwitterCache, getTwitterCache, getInstances } from "./user.js";

function parseSearchHtml(html) {
  const tweets = [];
  const tweetRegex = /<div class="timeline-item[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="timeline-item|$)/g;
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

function formatSearchResults(tweets, query) {
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
        title: `🔍 Search results for "${query}"`,
        fields,
        footer: { text: `Showing ${tweets.length} results • Twitter/X via Nitter` },
      },
    ],
  };
}

class TwitterSearchCommand extends Command {
  async run() {
    this.success = false;
    const query = this.getOptionString("query", true);

    if (!query) {
      return "❌ Gabe says: You forgot to tell me what to search for!";
    }

    await this.acknowledge();

    const cacheKey = `twitter:search:${encodeURIComponent(query)}`;
    if (getTwitterCache(cacheKey)) {
      const tweets = getTwitterCache(cacheKey);
      this.success = true;
      return formatSearchResults(tweets, query);
    }

    try {
      const urls = getInstances().map((i) => `${i}/search?q=${encodeURIComponent(query)}`);
      const response = await fetchWithFallback(urls);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't search tweets. Try again later.";
      }

      const html = await response.text();
      const tweets = parseSearchHtml(html);

      if (tweets.length === 0) {
        return "❌ Gabe says: No tweets found for that search.";
      }

      setTwitterCache(cacheKey, tweets, 120000);
      this.success = true;
      return formatSearchResults(tweets, query);
    } catch (error) {
      if (error instanceof Error && error.message.includes("All instances failed")) {
        return "❌ Gabe says: All Nitter instances failed. Twitter might be having issues or instances are down. Try again later.";
      }
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
  static description = "Search Twitter/X for tweets";
  static aliases = ["find"];
  static category = "internet";
}

export default TwitterSearchCommand;
