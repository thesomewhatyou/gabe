import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class SusCommand extends Command {
  static responses = [
    "඾ THAT'S A BIT SUSSY ඞ",
    "📮 When the impostor is sus 📮",
    "඾ Emergency meeting ඞ",
    "Red is sus ngl",
    "I saw you vent ඞ",
    "඾඾඾ AMONG US ඞඞඞ",
    "Vote them out, they're acting sus",
    "඾ You're getting ejected for that ඞ",
    "📮📮📮 SUSSY BAKA 📮📮📮",
    "඾ Dead body reported ඞ",
  ];

  async run() {
    const target = this.getOptionUser("user");
    const response = random(SusCommand.responses);

    if (target) {
      return `${target.mention} ${response}`;
    }

    return response;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Call someone sus",
      required: false,
    },
  ];

  static description = "When the impostor is sus";
  static aliases = ["impostor", "amogus", "amongus", "sussy"];
}

export default SusCommand;
