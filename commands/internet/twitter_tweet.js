import { Constants } from "oceanic.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import Command from "#cmd-classes/command.js";
import {
  getInstances,
  getTwitterCache,
  setTwitterCache,
  parseTweetHtml,
  formatTweet,
} from "#utils/twitter.js";

class TwitterTweetCommand extends Command {
  async run() {
    this.success = false;
    const input = this.getOptionString("url_or_id", true);

    if (!input) {
      return "❌ Gabe says: You forgot to tell me which tweet to fetch!";
    }

    await this.acknowledge();

    let username;
    let tweetId;

    const urlMatch = input.match(/twitter\.com\/(\w+)\/status\/(\d+)/);
    const idMatch = input.match(/^(\d+)$/);

    if (urlMatch) {
      username = urlMatch[1];
      tweetId = urlMatch[2];
    } else if (idMatch) {
      tweetId = idMatch[1];
      return "❌ Gabe says: Please provide full Twitter URL, not just a tweet ID.";
    } else {
      return "❌ Gabe says: That doesn't look like a valid Twitter URL. Format: https://twitter.com/username/status/123456";
    }

    const cacheKey = `twitter:tweet:${tweetId}`;
    if (getTwitterCache(cacheKey)) {
      const tweet = getTwitterCache(cacheKey);
      return formatTweet(tweet, username, tweetId);
    }

    try {
      const urls = getInstances().map((i) => `${i}/${username}/status/${tweetId}`);
      const response = await fetchWithFallback(urls);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't fetch that tweet. Try again later.";
      }

      const html = await response.text();
      const tweet = parseTweetHtml(html);

      if (!tweet.content && !tweet.author) {
        return "❌ Gabe says: Couldn't parse that tweet. It might not exist.";
      }

      setTwitterCache(cacheKey, tweet, 180000);
      this.success = true;
      return formatTweet(tweet, username, tweetId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("All instances failed")) {
        return "❌ Gabe says: All Nitter instances failed. Twitter might be having issues or instances are down. Try again later.";
      }
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "url_or_id",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Twitter tweet URL",
      required: true,
    },
  ];
  static description = "Fetch a specific Twitter/X tweet";
  static aliases = ["tweet"];
  static category = "internet";
}

export default TwitterTweetCommand;
