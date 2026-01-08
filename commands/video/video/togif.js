import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class ToGifCommand extends ImageCommand {
  paramsFunc() {
    const fps = this.getOptionInteger("fps") ?? 15;
    const width = this.getOptionInteger("width") ?? 480;
    return {
      fps: Math.min(Math.max(fps, 5), 30),
      width: Math.min(Math.max(width, 120), 720),
    };
  }

  static init() {
    super.init();
    this.flags.push(
      {
        name: "fps",
        type: Constants.ApplicationCommandOptionTypes.INTEGER,
        description: "Frames per second (5-30, default: 15)",
        minValue: 5,
        maxValue: 30,
      },
      {
        name: "width",
        type: Constants.ApplicationCommandOptionTypes.INTEGER,
        description: "Output width in pixels (120-720, default: 480)",
        minValue: 120,
        maxValue: 720,
      },
    );
    return this;
  }

  static description = "Convert a video to an animated GIF";
  static aliases = ["gif", "makegif", "v2g"];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to convert to GIF!";
  static command = "videotogif";
}

export default ToGifCommand;
