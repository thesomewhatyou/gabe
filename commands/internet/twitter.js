import Command from "#cmd-classes/command.js";

class TwitterCommand extends Command {
  static description = "Twitter/X commands";
  static aliases = ["tw", "twitter", "x"];
  static slashAllowed = true;
}

export default TwitterCommand;
