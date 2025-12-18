import BroadcastCommand from "./admin/broadcast.js";

class AdminCommand extends BroadcastCommand {
  static description = "Administrative commands for bot management";
  static aliases = ["administration"];
  static adminOnly = true;
}

export default AdminCommand;
