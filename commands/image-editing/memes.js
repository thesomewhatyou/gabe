import Command from "#cmd-classes/command.js";

class MemesCommand extends Command {
    static description = "Generate memes and add text to images";
    static aliases = ["meme"];
}

export default MemesCommand;
