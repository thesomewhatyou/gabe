import Command from "#cmd-classes/command.js";

class EditCommand extends Command {
    static description = "Edit an image";
    static aliases = ["e", "ed"];
    static slashAllowed = true;
}

export default EditCommand;
