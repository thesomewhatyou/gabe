import InviteCommand from "./info/invite.js";

class InfoCommand extends InviteCommand {
  static description = "Get information about the bot";
  static aliases = ["botinfo"];
}

export default InfoCommand;
