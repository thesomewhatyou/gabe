import Command from "#cmd-classes/command.js";

class StarboardCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return this.getString("commands.responses.starboard.serverOnly");
    }

    if (!this.member?.permissions.has("ADMINISTRATOR")) {
      this.success = false;
      return this.getString("commands.responses.starboard.adminOnly");
    }

    return this.getString("commands.responses.starboard.help");
  }

  static description = "Manage the starboard";
  static aliases = ["sb"];
  static adminOnly = true;
  static dbRequired = true;
}

export default StarboardCommand;
