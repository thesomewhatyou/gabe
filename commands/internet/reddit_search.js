import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import {
  getRedditCache,
  setRedditCache,
  filterNSFW,
  formatPostsList,
} from "#utils/reddit.js";

class RedditSearchCommand extends Command {
  async run() {
    this.success = false;
    const query = this.getOptionString("query", true);
    const subreddit = this.getOptionString("subreddit");

    if (!query) {
      return "❌ Gabe says: You forgot to tell me what to search for!";
    }

    await this.acknowledge();

    let url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10`;
    if (subreddit) {
      url += `&restrict_sr=on&sr=${encodeURIComponent(subreddit)}`;
    }

    const cacheKey = `reddit:search:${encodeURIComponent(query)}:${subreddit || "all"}`;
    if (getRedditCache(cacheKey)) {
      const posts = getRedditCache(cacheKey);
      this.success = true;
      return formatPostsList(
        posts,
        subreddit ? `Search in r/${subreddit}: "${query}"` : `Search results for "${query}"`,
      );
    }

    try {
      const response = await fetchWithFallback([url]);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't search Reddit. Try again later.";
      }

      const data = await response.json();

      if (!data || !data.data || !data.data.children || data.data.children.length === 0) {
        return "❌ Gabe says: No posts found for that search.";
      }

      const allPosts = data.data.children.map((child) => child.data);
      const safePosts = filterNSFW(allPosts);

      if (safePosts.length === 0) {
        return "❌ Gabe says: All results were NSFW. I blocked them for your safety.";
      }

      setRedditCache(cacheKey, safePosts, 120000);
      this.success = true;
      return formatPostsList(
        safePosts,
        subreddit ? `Search in r/${subreddit}: "${query}"` : `Search results for "${query}"`,
      );
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
    {
      name: "subreddit",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Optional subreddit to search in (without r/)",
    },
  ];

  static description = "Search Reddit for posts";
  static aliases = ["search"];
  static category = "internet";
}

export default RedditSearchCommand;
