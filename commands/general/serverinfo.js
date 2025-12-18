import InfoCommand from "./serverinfo/info.js";

class ServerInfoCommand extends InfoCommand {
  static description = "Server and bot information commands";
  static aliases = ["si", "sinfo"];
}

export default ServerInfoCommand;
