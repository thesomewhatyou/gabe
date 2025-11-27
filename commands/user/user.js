import UserInfoCommand from "./user/userinfo.js";

class UserCommand extends UserInfoCommand {
  static description = "User information commands. Use subcommands: userinfo, serverinfo, roleinfo, avatar";
  static aliases = ["u", "info"];
}

export default UserCommand;
