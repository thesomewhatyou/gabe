const redditCache = new Map();

export function setRedditCache(key, value, ttlMs) {
  redditCache.set(key, value);
  setTimeout(() => redditCache.delete(key), ttlMs);
}

export function getRedditCache(key) {
  return redditCache.get(key);
}

export function filterNSFW(posts) {
  const filtered = posts.filter((post) => !(post.data ?? post).over_18);
  const blockedCount = posts.length - filtered.length;

  if (blockedCount > 0) {
    console.log(`Filtered ${blockedCount} NSFW posts from Reddit results`);
  }

  return filtered;
}

export function formatPost(post) {
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

export function formatPostsList(posts, title) {
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

export function formatUser(user, username) {
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
