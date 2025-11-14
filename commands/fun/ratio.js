import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class RatioCommand extends Command {
  static responses = [
    "L + ratio + you fell off + cope + seethe + mald",
    "Ratio + didn't ask + don't care + cry about it",
    "Counter ratio + you're cringe + touch grass",
    "Ratio + skill issue + no one asked",
    "L + plundered + no wenches + walk the plank",
    "Ratio + you're maidenless + no runes",
    "Didn't ask + L + ratio + you're shorter",
    "Ratio + cancelled + ended your career",
    "🤓 'ackshually' + ratio + touch grass",
    "Ratio + I'm living in your walls",
  ];

  async run() {
    const target = this.getOptionUser("user");
    const response = random(RatioCommand.responses);

    if (target) {
      return `📊 ${target.mention} ${response}`;
    }

    return `📊 ${response}`;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to ratio",
      required: false,
    },
  ];

  static description = "Ratio someone with modern internet discourse";
  static aliases = ["L", "cope", "seethe"];
}

export default RatioCommand;
