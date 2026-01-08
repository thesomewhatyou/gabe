import Command from "#cmd-classes/command.js";

class BattleCommand extends Command {
  static description = "Competitive image editing battles";
  static aliases = ["imgbattle", "imagebattle"];
  static slashAllowed = true;
}

export default BattleCommand;
