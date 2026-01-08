import ImageCommand from "#cmd-classes/imageCommand.js";

class ReverseCommand extends ImageCommand {
  static description = "Play a video backwards";
  static aliases = ["backwards", "rewind"];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to reverse!";
  static command = "videoreverse";
}

export default ReverseCommand;
