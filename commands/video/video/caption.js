import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class CaptionCommand extends ImageCommand {
  paramsFunc() {
    const text = this.getOptionString("text") ?? this.args.join(" ");
    const position = this.getOptionString("position") ?? "top";
    const fontSize = this.getOptionInteger("fontsize") ?? 32;
    return {
      caption: text,
      position,
      font_size: Math.min(Math.max(fontSize, 12), 72),
    };
  }

  static init() {
    super.init();
    this.flags.unshift({
      name: "text",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The caption text to add",
      required: true,
      classic: true,
    });
    this.flags.push(
      {
        name: "position",
        type: Constants.ApplicationCommandOptionTypes.STRING,
        description: "Where to place the caption",
        choices: [
          { name: "Top", value: "top" },
          { name: "Bottom", value: "bottom" },
        ],
      },
      {
        name: "fontsize",
        type: Constants.ApplicationCommandOptionTypes.INTEGER,
        description: "Font size in pixels (12-72, default: 32)",
        minValue: 12,
        maxValue: 72,
      },
    );
    return this;
  }

  static description = "Add a text caption to a video";
  static aliases = ["subtitle", "text"];

  static requiresImage = true;
  static requiresVideo = true;
  static requiresParam = true;
  static requiredParam = "text";
  static noImage = "You need to provide a video to add a caption!";
  static noParam = "You need to provide caption text!";
  static command = "videocaption";
}

export default CaptionCommand;
