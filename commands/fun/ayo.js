import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class AyoCommand extends Command {
  static responses = [
    "📸🤨",
    "AYO? 📸🤨",
    "🤨📸 Caught in 4K",
    "📸 AYOOOO 🤨",
    "📸 HOLD UP 🤨",
    "PAUSE ⏸️🤨",
    "🤨 What did you just say?",
    "📸🤨 This is going in my cringe compilation",
    "AYOOOOO 🤨📸📸📸",
    "🚨 CAUGHT LACKING 🚨",
  ];

  async run() {
    const target = this.getOptionUser("user");
    const response = random(AyoCommand.responses);

    if (target) {
      return `${target.mention} ${response}`;
    }

    return response;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Catch someone in 4K",
      required: false,
    },
  ];

  static description = "Ayo? 📸🤨 Caught in 4K";
  static aliases = ["pause", "caught", "4k", "caughtin4k"];
}

export default AyoCommand;
