import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class SpeedCommand extends ImageCommand {
  paramsFunc() {
    const multiplier = this.getOptionNumber("multiplier") ?? 2;
    const slow = this.getOptionBoolean("slow") ?? false;
    return {
      speed: Math.min(Math.max(multiplier, 0.25), 4),
      slow,
    };
  }

  static init() {
    super.init();
    this.flags.push(
      {
        name: "multiplier",
        type: Constants.ApplicationCommandOptionTypes.NUMBER,
        description: "Speed multiplier (0.25x to 4x, default: 2)",
        minValue: 0.25,
        maxValue: 4,
        classic: true,
      },
      {
        name: "slow",
        type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
        description: "Slow down instead of speed up",
      },
    );
    return this;
  }

  static description = "Change the playback speed of a video";
  static aliases = ["fastforward", "slowmo", "ff"];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to change the speed!";
  static command = "videospeed";
}

export default SpeedCommand;
