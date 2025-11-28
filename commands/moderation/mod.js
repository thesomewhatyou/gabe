import BanCommand from "./mod/ban.js";

class ModCommand extends BanCommand {
    static description = "Moderation commands for managing your server";
    static aliases = ["moderation", "moderate"];
}

export default ModCommand;
