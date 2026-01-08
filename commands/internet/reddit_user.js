import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { fetchWithFallback } from "#utils/apifetch.js";
import {
  getRedditCache,
  setRedditCache,
  formatUser,
} from "#utils/reddit.js";

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

export default RedditUserCommand;
