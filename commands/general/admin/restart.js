import Command from "#cmd-classes/command.js";
import { exit } from "#utils/misc.js";
import { isOwner } from "#utils/owners.js";

class RestartCommand extends Command {
  async run() {
    if (!isOwner(this.author?.id)) {
      this.success = false;
      return this.getString("commands.responses.restart.owner");
    }
    try {
      return this.getString("commands.responses.restart.restarting");
    } finally {
      await exit(this.client, this.database);
    }
  }

  static description = "Restarts me";
  static aliases = ["reboot"];
  static adminOnly = true;
}

export default RestartCommand;
