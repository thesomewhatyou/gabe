import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoCaptionCommand extends ImageCommand {
  paramsFunc() {
    const caption = this.getOptionString("text") ?? this.args.join(" ");
    const position = this.getOptionString("position") ?? "top";
    const fontSize = this.getOptionNumber("fontsize") ?? 32;
    return {
      caption,
      position,
      font_size: fontSize,
    };
  }

  static description = "Add a caption to a video";
  static aliases = ["vcaption", "videocaption", "vtext"];
  static flags = [
    {
      name: "text",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Caption text to add",
      required: true,
      classic: true,
    },
    {
      name: "position",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Caption position (top or bottom)",
      choices: [
        { name: "Top", value: "top" },
        { name: "Bottom", value: "bottom" },
      ],
    },
    {
      name: "fontsize",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Font size (default: 32)",
      min_value: 12,
      max_value: 72,
    },
  ];

  static requiresImage = true;
  static requiresVideo = true;
  static requiresParam = true;
  static requiredParam = "text";
  static noImage = "You need to provide a video to caption!";
  static noParam = "You need to provide caption text!";
  static command = "videocaption";
}

export default VideoCaptionCommand;
