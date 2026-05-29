import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";
import { parseIntegerArg } from "#utils/commandArgs.js";

class SpeedCommand extends ImageCommand {
  paramsFunc() {
    const speed = this.getOptionInteger("multiplier", true) ?? parseIntegerArg(this.args[0]);
    return {
      speed: speed === undefined || speed < 1 ? 2 : speed,
    };
  }

  static init() {
    super.init();
    this.flags.push({
      name: "multiplier",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Set the speed multiplier (default: 2)",
      minValue: 1,
      maxValue: 1000,
      classic: true,
    });
    return this;
  }

  static description = "Makes an image sequence faster";
  static aliases = ["speedup", "fast", "gifspeed", "faster"];

  static requiresAnim = true;
  static alwaysGIF = true;
  static noImage = "You need to provide an image/GIF to speed up!";
  static command = "speed";
}

export default SpeedCommand;
