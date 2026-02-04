import AntinukeEnableCommand from "./antinuke/enable.js";

class AntinukeCommand extends AntinukeEnableCommand {
  static description = "Anti-nuke protection system - prevents mass destructive actions";
  static aliases = ["antinuke", "an", "nuke-protection"];
}

export default AntinukeCommand;
