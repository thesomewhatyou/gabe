import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class ToggleCommand extends Command {
  async run() {
    if (!this.guild || !this.database) {
      this.success = false;
      return this.getString("commands.responses.starboard.serverOnly");
    }

    if (!this.member?.permissions.has("MANAGE_GUILD")) {
      this.success = false;
      return this.getString("commands.responses.starboard.manageGuildOnly");
    }

    const status = this.getOption("enabled", Constants.ApplicationCommandOptionTypes.BOOLEAN);
    if (status === undefined) {
      this.success = false;
      return this.getString("commands.responses.starboard.toggleRequired");
    }

    const settings = await this.database.getStarboardSettings(this.guild.id);
    settings.enabled = status;
    await this.database.setStarboardSettings(settings);

    return status
      ? this.getString("commands.responses.starboard.enabled")
      : this.getString("commands.responses.starboard.disabled");
  }

  static description = "Enable or disable the starboard";
  static flags = [
    {
      name: "enabled",
      description: "Whether the starboard should be active",
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      required: true,
    },
  ];
  static dbRequired = true;
}

export default ToggleCommand;
