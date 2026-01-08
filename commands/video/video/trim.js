import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class TrimCommand extends ImageCommand {
  paramsFunc() {
    const start = this.getOptionNumber("start") ?? 0;
    const duration = this.getOptionNumber("duration") ?? 10;
    return {
      start: Math.max(start, 0),
      duration: Math.min(Math.max(duration, 0.5), 60),
    };
  }

  static init() {
    super.init();
    this.flags.push(
      {
        name: "duration",
        type: Constants.ApplicationCommandOptionTypes.NUMBER,
        description: "Duration in seconds (0.5-60, default: 10)",
        required: true,
        minValue: 0.5,
        maxValue: 60,
        classic: true,
      },
      {
        name: "start",
        type: Constants.ApplicationCommandOptionTypes.NUMBER,
        description: "Start time in seconds (default: 0)",
        minValue: 0,
      },
    );
    return this;
  }

  static description = "Trim a video to a specific duration";
  static aliases = ["cut", "clip"];

  static requiresImage = true;
  static requiresVideo = true;
  static requiresParam = true;
  static requiredParam = "duration";
  static requiredParamType = Constants.ApplicationCommandOptionTypes.NUMBER;
  static noImage = "You need to provide a video to trim!";
  static noParam = "You need to specify how long the clip should be!";
  static command = "videotrim";
}

export default TrimCommand;
