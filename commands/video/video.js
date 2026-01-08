import Command from "#cmd-classes/command.js";

class VideoCommand extends Command {
  static description = "Process and edit videos";
  static aliases = ["vid"];
  static slashAllowed = true;
}

export default VideoCommand;
