import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class NoUCommand extends Command {
  async run() {
    const target = this.getOptionUser("user");

    if (target) {
      return `🔄 No u, ${target.mention}`;
    }

    return "🔄 No u";
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The ultimate comeback target",
      required: false,
    },
  ];

  static description = "The ultimate comeback: no u";
  static aliases = ["reverse", "uno"];
}

export default NoUCommand;
