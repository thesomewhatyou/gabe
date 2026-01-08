import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import {
  getRedditCache,
  setRedditCache,
  formatPost,
} from "#utils/reddit.js";

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

export default RedditPostCommand;