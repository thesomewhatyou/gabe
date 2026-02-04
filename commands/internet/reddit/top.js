import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import { setRedditCache, getRedditCache, filterNSFW } from "./post.js";

function formatPostsList(posts, title) {
  if (posts.length === 0) {
    return "❌ Gabe says: No posts found.";
  }

  const fields = posts.slice(0, 10).map((post) => ({
    name: post.title.substring(0, 50) + (post.title.length > 50 ? "..." : ""),
    value: `⬆️ ${post.score.toLocaleString()} | 💬 ${post.num_comments.toLocaleString()}\n${post.url ? `[Link](${post.url})` : ""}`,
    inline: false,
  }));

  return {
    embeds: [
      {
        color: 0xff4500,
        title: `📄 ${title}`,
        fields,
        footer: { text: `Showing ${posts.length} posts • Reddit` },
      },
    ],
  };
}

class RedditTopCommand extends Command {
  async run() {
    this.success = false;
    const subreddit = this.getOptionString("subreddit", true);
    const time = this.getOptionString("time") || "day";
    const limit = this.getOptionInteger("limit") || 5;

    if (!subreddit) {
      return "❌ Gabe says: You forgot to tell me which subreddit to fetch!";
    }

    if (!["hour", "day", "week", "month", "year", "all"].includes(time)) {
      return "❌ Gabe says: Time must be one of: hour, day, week, month, year, all";
    }

    if (limit < 1 || limit > 25) {
      return "❌ Gabe says: Limit must be between 1 and 25!";
    }

    await this.acknowledge();

    const cacheKey = `reddit:top:${subreddit}:${time}:${limit}`;
    if (getRedditCache(cacheKey)) {
      const posts = getRedditCache(cacheKey);
      this.success = true;
      return formatPostsList(posts, `Top posts in r/${subreddit} (${time})`);
    }

    try {
      const response = await fetchWithFallback([
        `https://www.reddit.com/r/${subreddit}/top.json?t=${time}&limit=${limit}`,
      ]);

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
      return formatPostsList(safePosts, `Top posts in r/${subreddit} (${time})`);
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
      name: "time",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Time period (hour, day, week, month, year, all)",
      choices: [
        { name: "Hour", value: "hour" },
        { name: "Day", value: "day" },
        { name: "Week", value: "week" },
        { name: "Month", value: "month" },
        { name: "Year", value: "year" },
        { name: "All time", value: "all" },
      ],
    },
    {
      name: "limit",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Number of posts to fetch (1-25)",
      minValue: 1,
      maxValue: 25,
    },
  ];

  static description = "Fetch top posts from a subreddit";
  static aliases = [];
  static category = "internet";
}

export default RedditTopCommand;
export { formatPostsList };
