import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoTrimCommand extends ImageCommand {
  paramsFunc() {
    const start = this.getOptionNumber("start") ?? 0;
    const duration = this.getOptionNumber("duration") ?? 10;
    return {
      start,
      duration,
    };
  }

  static description = "Trim/cut a video to a specific duration";
  static aliases = ["vtrim", "videotrim", "vcut", "cut"];
  static flags = [
    {
      name: "start",
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      description: "Start time in seconds (default: 0)",
      min_value: 0,
    },
    {
      name: "duration",
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      description: "Duration in seconds (0.5-60, default: 10)",
      required: true,
      min_value: 0.5,
      max_value: 60,
      classic: true,
    },
  ];

  static requiresImage = true;
  static requiresVideo = true;
  static requiresParam = true;
  static requiredParam = "duration";
  static requiredParamType = Constants.ApplicationCommandOptionTypes.NUMBER;
  static noImage = "You need to provide a video to trim!";
  static noParam = "You need to specify a duration!";
  static command = "videotrim";
}

export default VideoTrimCommand;
