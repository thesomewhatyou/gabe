import Command from "#cmd-classes/command.js";

class ImageCommand extends Command {
    static description = "Modify an image";
    static aliases = ["i", "im"];
}

export default ImageCommand;
