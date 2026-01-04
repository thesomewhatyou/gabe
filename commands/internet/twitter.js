import { Constants } from "oceanic.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import process from "node:process";
import Command from "#cmd-classes/command.js";

const DEFAULT_NITTER = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.privacydev.net",
  "https://nitter.nixnet.services",
];

const getInstances = () => {
  return process.env.NITTER_INSTANCES ? process.env.NITTER_INSTANCES.split(",") : DEFAULT_NITTER;
};

const twitterCache = new Map();

function setTwitterCache(key, value, ttlMs) {
  twitterCache.set(key, value);
  setTimeout(() => twitterCache.delete(key), ttlMs);
}

function getTwitterCache(key) {
  return twitterCache.get(key);
}

function parseProfileHtml(html) {
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const handleMatch = html.match(/@(\w+)/);
  const bioMatch = html.match(/<div class="profile-bio">([^<]+)<\/div>/);
  const avatarMatch = html.match(/<img class="profile-avatar" src="([^"]+)"/);
  const bannerMatch = html.match(/<img class="profile-banner" src="([^"]+)"/);
  const followersMatch = html.match(/Followers<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
  const followingMatch = html.match(/Following<\/span>\s*<span[^>]*>([^<]+)<\/span>/);

  return {
    name: nameMatch?.[1]?.trim(),
    handle: handleMatch?.[1],
    bio: bioMatch?.[1]?.trim(),
    avatar: avatarMatch?.[1],
    banner: bannerMatch?.[1],
    followers: followersMatch?.[1],
    following: followingMatch?.[1],
  };
}

function parseTweetHtml(html) {
  const contentMatch = html.match(/<div class="tweet-content"[^>]*>([\s\S]*?)<\/div>/);
  const likesMatch = html.match(/<span[^>]*>Like<\/span>\s*<span[^>]*>(\d+)<\/span>/);
  const retweetsMatch = html.match(/<span[^>]*>Retweet<\/span>\s*<span[^>]*>(\d+)<\/span>/);
  const repliesMatch = html.match(/<span[^>]*>Reply<\/span>\s*<span[^>]*>(\d+)<\/span>/);
  const authorMatch = html.match(/<a class="username"[^>]*>@(\w+)<\/a>/);
  const timeMatch = html.match(/<span class="tweet-date"[^>]*>([^<]+)<\/span>/);

  let content = "";
  if (contentMatch) {
    content = contentMatch[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    content,
    likes: likesMatch?.[1] || "0",
    retweets: retweetsMatch?.[1] || "0",
    replies: repliesMatch?.[1] || "0",
    author: authorMatch?.[1],
    time: timeMatch?.[1],
  };
}

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

function formatProfile(profile, username) {
  const fields = [];

  if (profile.handle) {
    fields.push({ name: "Handle", value: `@${profile.handle}`, inline: true });
  }
  if (profile.followers) {
    fields.push({ name: "Followers", value: profile.followers, inline: true });
  }
  if (profile.following) {
    fields.push({ name: "Following", value: profile.following, inline: true });
  }

  return {
    embeds: [
      {
        color: 0x1da1f2,
        title: `🐦 ${profile.name || username}`,
        description: profile.bio || "No bio available",
        thumbnail: { url: profile.avatar },
        image: profile.banner ? { url: profile.banner } : undefined,
        fields,
        url: `https://twitter.com/${username}`,
        footer: { text: "Twitter/X via Nitter" },
      },
    ],
  };
}

function formatTweet(tweet, username, tweetId) {
  const fields = [];

  if (tweet.likes) {
    fields.push({ name: "❤️ Likes", value: tweet.likes, inline: true });
  }
  if (tweet.retweets) {
    fields.push({ name: "🔄 Retweets", value: tweet.retweets, inline: true });
  }
  if (tweet.replies) {
    fields.push({ name: "💬 Replies", value: tweet.replies, inline: true });
  }

  return {
    embeds: [
      {
        color: 0x1da1f2,
        title: `🐦 ${tweet.author ? `@${tweet.author}` : "Tweet"}`,
        description: tweet.content || "No content available",
        fields,
        timestamp: tweet.time || undefined,
        url: tweetId ? `https://twitter.com/${username}/status/${tweetId}` : undefined,
        footer: { text: "Twitter/X via Nitter" },
      },
    ],
  };
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

class TwitterUserCommand extends Command {
  async run() {
    this.success = false;
    const username = this.getOptionString("username", true);

    if (!username) {
      return "❌ Gabe says: You forgot to tell me which Twitter user to fetch!";
    }

    await this.acknowledge();

    const cacheKey = `twitter:user:${username}`;
    if (getTwitterCache(cacheKey)) {
      const profile = getTwitterCache(cacheKey);
      return formatProfile(profile, username);
    }

    try {
      const urls = getInstances().map((i) => `${i}/${username}`);
      const response = await fetchWithFallback(urls);

      if (!response.ok) {
        return "❌ Gabe says: Couldn't fetch that Twitter profile. Try again later.";
      }

      const html = await response.text();
      const profile = parseProfileHtml(html);

      if (!profile.name && !profile.handle) {
        return "❌ Gabe says: Couldn't parse that Twitter profile. The user might not exist.";
      }

      setTwitterCache(cacheKey, profile, 180000);
      this.success = true;
      return formatProfile(profile, username);
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
  ];
  static description = "Fetch Twitter/X profile information";
  static aliases = ["tw", "twitter"];
  static category = "internet";
}

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
  static aliases = ["latest"];
  static category = "internet";
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
  static aliases = ["search"];
  static category = "internet";
}

export { TwitterUserCommand, TwitterTweetCommand, TwitterLatestCommand, TwitterSearchCommand };
