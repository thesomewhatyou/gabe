import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import {
  getRedditCache,
  setRedditCache,
  filterNSFW,
  formatPostsList,
} from "#utils/reddit.js";

class RedditNewCommand extends Command {
  async run() {
    this.success = false;
    const subreddit = this.getOptionString("subreddit", true);
    const limit = this.getOptionInteger("limit") || 5;

    if (!subreddit) {
      return "❌ Gabe says: You forgot to tell me which subreddit to fetch!";
    }

    if (limit < 1 || limit > 25) {
      return "❌ Gabe says: Limit must be between 1 and 25!";
    }

    await this.acknowledge();

    const cacheKey = `reddit:new:${subreddit}:${limit}`;
    if (getRedditCache(cacheKey)) {
      const posts = getRedditCache(cacheKey);
      this.success = true;
      return formatPostsList(posts, `New posts in r/${subreddit}`);
    }

    try {
      const response = await fetchWithFallback([`https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`]);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't fetch posts. Try again later.";
      }

      const data = await response.json();

      if (!data || !data.data || !data.data.children || data.data.children.length === 0) {
        return "❌ Gabe says: No posts found in that subreddit.";
      }

      const allPosts = data.data.children.map((child) => child.data);
      const safePosts = filterNSFW(allPosts);

      if (safePosts.length === 0) {
        return "❌ Gabe says: All results were NSFW. I blocked them for your safety.";
      }

      setRedditCache(cacheKey, safePosts, 120000);
      this.success = true;
      return formatPostsList(safePosts, `New posts in r/${subreddit}`);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "subreddit",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Subreddit name (without r/)",
      required: true,
    },
    {
      name: "limit",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Number of posts to fetch (1-25)",
      minValue: 1,
      maxValue: 25,
    },
  ];

  static description = "Fetch newest posts from a subreddit";
  static aliases = ["new", "newposts"];
  static category = "internet";
}

export default RedditNewCommand;
