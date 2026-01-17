import process from "node:process";

const DEFAULT_NITTER = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.privacydev.net",
  "https://nitter.nixnet.services",
];

export const getInstances = () => {
  return process.env.NITTER_INSTANCES ? process.env.NITTER_INSTANCES.split(",") : DEFAULT_NITTER;
};

const twitterCache = new Map();

export function setTwitterCache(key, value, ttlMs) {
  twitterCache.set(key, value);
  setTimeout(() => twitterCache.delete(key), ttlMs);
}

export function getTwitterCache(key) {
  return twitterCache.get(key);
}

export function parseProfileHtml(html) {
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const handleMatch = html.match(/@(\w+)/);
  const bioMatch = html.match(/<div class="profile-bio">([^<]+)<\/div>/);
  const avatarMatch = html.match(/<img class="profile-avatar" src="([^"]+)"/
);
  const bannerMatch = html.match(/<img class="profile-banner" src="([^"]+)"/
);
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

export function parseTweetHtml(html) {
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

export function parseTweetsHtml(html) {
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

export function parseSearchHtml(html) {
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

export function formatProfile(profile, username) {
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

export function formatTweet(tweet, username, tweetId) {
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

export function formatTweetsList(tweets, username) {
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

export function formatSearchResults(tweets, query) {
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
