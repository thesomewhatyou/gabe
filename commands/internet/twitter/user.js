import process from "node:process";
import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";

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
  static aliases = ["profile"];
  static category = "internet";
}

export default TwitterUserCommand;
export { setTwitterCache, getTwitterCache, getInstances, parseProfileHtml, formatProfile };
