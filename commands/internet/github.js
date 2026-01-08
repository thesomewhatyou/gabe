import Command from "#cmd-classes/command.js";

class GitHubCommand extends Command {
  static description = "GitHub commands";
  static aliases = ["gh", "github"];
  static slashAllowed = true;
}

export default GitHubCommand;