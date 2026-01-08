import Command from "#cmd-classes/command.js";

class VideoCommand extends Command {
  static description = "Video processing and editing commands";
  static aliases = ["vid", "v"];
  static slashAllowed = true;
}

export default VideoCommand;
