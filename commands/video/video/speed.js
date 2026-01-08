import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoSpeedCommand extends ImageCommand {
  paramsFunc() {
    const speed = this.getOptionNumber("multiplier") ?? 2;
    const slow = this.getOptionBoolean("slow") ?? false;
    return {
      speed,
      slow,
    };
  }

  static description = "Speed up or slow down a video";
  static aliases = ["vspeed", "videospeed", "fastforward", "slowmo"];
  static flags = [
    {
      name: "multiplier",
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      description: "Speed multiplier (0.25-4.0, default: 2)",
      min_value: 0.25,
      max_value: 4,
      classic: true,
    },
    {
      name: "slow",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      description: "Slow down instead of speed up",
    },
  ];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to adjust speed!";
  static command = "videospeed";
}

export default VideoSpeedCommand;
