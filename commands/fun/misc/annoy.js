import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class AnnoyCommand extends Command {
  static responses = [
    "your socks have been spiritually mismatched",
    "gabe moved your imaginary keyboard one inch to the left",
    "your next snack will make exactly one suspicious crunch",
    "your playlist has been replaced with elevator jazz in spirit only",
    "gabe has scheduled a harmless reminder to blink manually",
    "your cursor now has mysterious confidence",
    "your chair has been declared mildly dramatic",
    "your cubes in Blender turn into friendly spheres",
    "gabe has hidden one tiny confetti cannon in your vibe",
    "your aura now smells faintly like fresh printer paper",
    "gabe says your next loading bar will pause at 99 percent for style",
    "your shoelaces have unionized emotionally",
  ];

  async run() {
    const user = this.getOptionUser("who");
    const target = user ?? this.author;
    return `${target.mention}, ${random(AnnoyCommand.responses)}`;
  }

  static flags = [
    {
      name: "who",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "User to annoy (defaults to you)",
      classic: true,
    },
  ];
  static description = "Lightly annoy someone with harmless Gabe nonsense";
  static aliases = ["annoy", "pester", "bug", "tease"];
  static dbRequired = false;
  static cooldown = 5;
  static cooldownMessage = "WAIT. Just wait.";
  static cooldownType = "user";
}

export default AnnoyCommand;
