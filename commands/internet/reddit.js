import Command from "#cmd-classes/command.js";

class RedditCommand extends Command {
  static description = "Reddit commands";
  static aliases = ["rd", "reddit"];
  static slashAllowed = true;
}

export default RedditCommand;