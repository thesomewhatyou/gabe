import { Constants } from "oceanic.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import Command from "#cmd-classes/command.js";
import {
  getInstances,
  getTwitterCache,
  setTwitterCache,
  parseSearchHtml,
  formatSearchResults,
} from "#utils/twitter.js";

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
  static aliases = ["search"];
  static category = "internet";
}

export default TwitterSearchCommand;
