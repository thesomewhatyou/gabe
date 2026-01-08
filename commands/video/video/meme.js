import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoMemeCommand extends ImageCommand {
  paramsFunc() {
    const top = this.getOptionString("top") ?? "";
    const bottom = this.getOptionString("bottom") ?? this.args.join(" ");
    const fontSize = this.getOptionNumber("fontsize") ?? 48;
    return {
      top,
      bottom,
      font_size: fontSize,
    };
  }

  async criteria() {
    const top = this.getOptionString("top");
    const bottom = this.getOptionString("bottom") ?? this.args.join(" ");
    return !!(top || bottom);
  }

  static description = "Add classic top/bottom meme text to a video";
  static aliases = ["vmeme", "videomeme"];
  static flags = [
    {
      name: "top",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Top text",
    },
    {
      name: "bottom",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Bottom text",
      classic: true,
    },
    {
      name: "fontsize",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Font size (default: 48)",
      min_value: 16,
      max_value: 96,
    },
  ];

  static requiresImage = true;
  static requiresVideo = true;
  static requiresParam = true;
  static requiredParam = "bottom";
  static noImage = "You need to provide a video!";
  static noParam = "You need to provide at least some text!";
  static command = "videomeme";
}

export default VideoMemeCommand;
