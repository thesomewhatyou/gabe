import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoReverseCommand extends ImageCommand {
  static description = "Reverse a video (plays backwards)";
  static aliases = ["vreverse", "videoreverse", "backwards"];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to reverse!";
  static command = "videoreverse";
}

export default VideoReverseCommand;
