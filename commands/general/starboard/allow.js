import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class AllowCommand extends Command {
  async run() {
    if (!this.guild || !this.database) {
      this.success = false;
      return this.getString("commands.responses.starboard.serverOnly");
    }

    if (!this.member?.permissions.has("MANAGE_GUILD")) {
      this.success = false;
      return this.getString("commands.responses.starboard.manageGuildOnly");
    }

    const allowSelf = this.getOption("self", Constants.ApplicationCommandOptionTypes.BOOLEAN);
    const allowBots = this.getOption("bots", Constants.ApplicationCommandOptionTypes.BOOLEAN);

    if (allowSelf === undefined && allowBots === undefined) {
      this.success = false;
      return this.getString("commands.responses.starboard.allowNoChange");
    }

    const settings = await this.database.getStarboardSettings(this.guild.id);
    if (allowSelf !== undefined) settings.allow_self = allowSelf;
    if (allowBots !== undefined) settings.allow_bots = allowBots;
    await this.database.setStarboardSettings(settings);

    return this.getString("commands.responses.starboard.allowUpdated", {
      params: {
        self: settings.allow_self ? this.getString("common.enabled") : this.getString("common.disabled"),
        bots: settings.allow_bots ? this.getString("common.enabled") : this.getString("common.disabled"),
      },
    });
  }

  static description = "Configure self/bot posting";
  static flags = [
    {
      name: "self",
      description: "Allow authors to star their own messages",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      required: false,
      classic: true,
    },
    {
      name: "bots",
      description: "Allow bot messages to be posted",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      required: false,
      classic: true,
    },
  ];
  static adminOnly = true;
  static dbRequired = true;
}

export default AllowCommand;

