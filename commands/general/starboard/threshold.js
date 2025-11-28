import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class ThresholdCommand extends Command {
  async run() {
    if (!this.guild || !this.database) {
      this.success = false;
      return this.getString("commands.responses.starboard.serverOnly");
    }

    if (!this.member?.permissions.has("MANAGE_GUILD")) {
      this.success = false;
      return this.getString("commands.responses.starboard.manageGuildOnly");
    }

    const threshold = this.getOption("threshold", Constants.ApplicationCommandOptionTypes.INTEGER, true);
    if (!threshold || threshold < 1 || threshold > 25) {
      this.success = false;
      return this.getString("commands.responses.starboard.invalidThreshold");
    }

    const settings = await this.database.getStarboardSettings(this.guild.id);
    settings.threshold = threshold;
    await this.database.setStarboardSettings(settings);

    return this.getString("commands.responses.starboard.thresholdSet", { params: { amount: threshold.toString() } });
  }

  static description = "Set how many stars a message needs";
  static flags = [
    {
      name: "threshold",
      description: "Minimum reactions before posting",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      required: true,
      minValue: 1,
      maxValue: 25,
      classic: true,
    },
  ];
  static adminOnly = true;
  static dbRequired = true;
}

export default ThresholdCommand;

