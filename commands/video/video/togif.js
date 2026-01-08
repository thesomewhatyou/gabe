import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoToGifCommand extends ImageCommand {
  paramsFunc() {
    const fps = this.getOptionNumber("fps") ?? 15;
    const width = this.getOptionNumber("width") ?? 480;
    return {
      fps,
      width,
    };
  }

  static description = "Convert a video to a GIF";
  static aliases = ["vtogif", "videotogif", "v2gif", "togif"];
  static flags = [
    {
      name: "fps",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Frames per second (5-30, default: 15)",
      min_value: 5,
      max_value: 30,
    },
    {
      name: "width",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Output width in pixels (120-720, default: 480)",
      min_value: 120,
      max_value: 720,
    },
  ];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to convert!";
  static command = "videotogif";
}

export default VideoToGifCommand;
