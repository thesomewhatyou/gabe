import Command from "#cmd-classes/command.js";

class MemesCommand extends Command {
  static description = "Create memes and add text overlays";
  static aliases = ["meme"];
  static slashAllowed = true;
}

export default MemesCommand;
