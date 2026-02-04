import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";

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
  static aliases = [];
  static category = "internet";
}

export default RedditPostCommand;
export { setRedditCache, getRedditCache, filterNSFW, formatPost };
