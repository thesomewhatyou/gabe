import Command from "#cmd-classes/command.js";

class EffectsCommand extends Command {
    static description = "Apply filters and effects to an image";
    static aliases = ["fx"];
}

export default EffectsCommand;
