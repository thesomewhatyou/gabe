import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";

const redditCache = new Map();

function setRedditCache(key, value, ttlMs) {
  redditCache.set(key, value);
  setTimeout(() => redditCache.delete(key), ttlMs);
}

function getRedditCache(key) {
  return redditCache.get(key);
}

function filterNSFW(posts) {
  const filtered = posts.filter((post) => !post.data.over_18);
  const blockedCount = posts.length - filtered.length;

  if (blockedCount > 0) {
    console.log(`Filtered ${blockedCount} NSFW posts from Reddit results`);
  }

  return filtered;
}

class RedditPostCommand extends Command {
  async run() {
    this.success = false;
    const url = this.getOptionString("url", true);

    if (!url) {
      return "❌ Gabe says: You forgot to tell me which Reddit post to fetch!";
    }

    await this.acknowledge();

    const urlMatch = url.match(/reddit\.com\/r\/(\w+)\/comments\/(\w+)/);
    if (!urlMatch) {
      return "❌ Gabe says: That doesn't look like a valid Reddit URL. Format: https://reddit.com/r/subreddit/comments/postid";
    }

    const subreddit = urlMatch[1];
    const postId = urlMatch[2];

    const cacheKey = `reddit:post:${postId}`;
    if (getRedditCache(cacheKey)) {
      const postData = getRedditCache(cacheKey);
      return formatPost(postData);
    }

    try {
      const response = await fetchWithFallback([`https://www.reddit.com/r/${subreddit}/comments/${postId}.json`]);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't fetch that Reddit post. Try again later.";
      }

      const data = await response.json();

      if (!data || !data[0] || !data[0].data || !data[0].data.children || data[0].data.children.length === 0) {
        return "❌ Gabe says: Couldn't parse that Reddit post. It might not exist.";
      }

      const postData = data[0].data.children[0].data;

      if (postData.over_18) {
        return "❌ Gabe says: That post is NSFW. I blocked it for your safety.";
      }

      setRedditCache(cacheKey, postData, 120000);
      this.success = true;
      return formatPost(postData);
    } catch (error) {
      return `❌ Gabe says: Something went wrong. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "url",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Reddit post URL",
      required: true,
    },
  ];

  static description = "Fetch a specific Reddit post";
  static aliases = ["rd", "reddit", "post"];
  static category = "internet";
}

function formatPost(post) {
  const fields = [];

  fields.push({ name: "Author", value: `u/${post.author}`, inline: true });
  fields.push({ name: "⬆️ Upvotes", value: post.score.toLocaleString(), inline: true });
  fields.push({ name: "💬 Comments", value: post.num_comments.toLocaleString(), inline: true });

  if (post.url_overridden_by_dest) {
    fields.push({ name: "🔗 Link", value: post.url_overridden_by_dest, inline: false });
  }

  let description = post.selftext || "";

  if (description.length > 2000) {
    description = description.substring(0, 2000) + "...";
  }

  return {
    embeds: [
      {
        color: 0xff4500,
        title: `📄 ${post.title.substring(0, 200)}`,
        description: description || post.url || "No content available",
        fields,
        url: post.permalink ? `https://www.reddit.com${post.permalink}` : undefined,
        footer: { text: `r/${post.subreddit} • Reddit` },
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
  static aliases = ["top"];
  static category = "internet";
}

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
  static aliases = ["reddituser"];
  static category = "internet";
}

function formatUser(user, username) {
  const createdDate = new Date(user.created_utc * 1000);
  const accountAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  const fields = [];

  fields.push({ name: "🍰 Cake Day", value: createdDate.toLocaleDateString(), inline: true });
  fields.push({ name: "📅 Account Age", value: `${accountAge} days`, inline: true });
  fields.push({ name: "⬆️ Link Karma", value: user.link_karma.toLocaleString(), inline: true });
  fields.push({ name: "💬 Comment Karma", value: user.comment_karma.toLocaleString(), inline: true });
  fields.push({ name: "👥 Total Karma", value: (user.link_karma + user.comment_karma).toLocaleString(), inline: true });

  return {
    embeds: [
      {
        color: 0xff4500,
        title: `👤 u/${username}`,
        description: user.subreddit?.title || "",
        thumbnail: { url: user.snoovatar_img || "" },
        fields,
        url: `https://www.reddit.com/user/${username}`,
        footer: { text: "Reddit" },
      },
    ],
  };
}

export { RedditPostCommand, RedditTopCommand, RedditNewCommand, RedditSearchCommand, RedditUserCommand };
