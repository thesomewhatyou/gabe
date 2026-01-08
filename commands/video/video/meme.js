import { Constants } from "oceanic.js";
import ImageCommand from "#cmd-classes/imageCommand.js";

class MemeCommand extends ImageCommand {
  paramsFunc() {
    const top = this.getOptionString("top") ?? "";
    const bottom = this.getOptionString("bottom") ?? this.args.join(" ");
    const fontSize = this.getOptionInteger("fontsize") ?? 48;
    return {
      top: this.clean(top),
      bottom: this.clean(bottom),
      font_size: Math.min(Math.max(fontSize, 16), 96),
    };
  }

  async criteria() {
    const top = this.getOptionString("top");
    const bottom = this.getOptionString("bottom") ?? this.args.join(" ");
    return !!(top || bottom);
  }

  static init() {
    super.init();
    this.flags.push(
      {
        name: "bottom",
        type: Constants.ApplicationCommandOptionTypes.STRING,
        description: "Bottom text",
        classic: true,
      },
      {
        name: "top",
        type: Constants.ApplicationCommandOptionTypes.STRING,
        description: "Top text",
      },
      {
        name: "fontsize",
        type: Constants.ApplicationCommandOptionTypes.INTEGER,
        description: "Font size in pixels (16-96, default: 48)",
        minValue: 16,
        maxValue: 96,
      },
    );
    return this;
  }

  static description = "Add classic top/bottom meme text to a video";
  static aliases = ["impact", "memevid"];

  static requiresImage = true;
  static requiresVideo = true;
  static requiresParam = true;
  static requiredParam = "bottom";
  static noImage = "You need to provide a video to meme-ify!";
  static noParam = "You need to provide at least some text!";
  static command = "videomeme";
}

export default MemeCommand;
