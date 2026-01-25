import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class ChooseCommand extends Command {
  static reactions = [
    "After careful consideration (2 milliseconds), Gabe picks:",
    "The council has decided. Gabe chooses:",
    "Gabe closes his eyes, spins around, and points at:",
    "The ancient algorithms have spoken. The answer is:",
    "Gabe consulted the Discord spirits. They say:",
    "After running 47 simulations, Gabe picks:",
    "Easy. Gabe's going with:",
    "No contest. Obviously it's:",
    "Gabe's crystal ball shows:",
    "The prophecy foretold:",
  ];

  static chaosReactions = [
    "Gabe couldn't decide, so he's picking BOTH. Deal with it.",
    "Gabe got bored and made up a new option:",
    "Plot twist: Gabe refuses to choose and walks away.",
    "The spirits said 'neither' but Gabe's going rogue:",
    "Gabe flipped a table and pointed at:",
  ];

  static madeUpOptions = [
    "touch grass instead",
    "a third secret option",
    "whatever you weren't expecting",
    "the nuclear option",
    "chaos",
    "sleep",
    "food",
  ];

  async run() {
    const inputStr = this.getOptionString("options") ?? this.args.join(" ");

    if (!inputStr || inputStr.trim().length === 0) {
      return "❌ Gabe can't choose from nothing. Give me some options!\n💡 Example: `/misc choose pizza, tacos, sushi` or `/misc choose pizza or tacos or sushi`";
    }

    // Parse options - support both comma and "or" as delimiters
    let options;
    if (inputStr.includes(",")) {
      options = inputStr.split(",").map((o) => o.trim()).filter((o) => o.length > 0);
    } else if (inputStr.toLowerCase().includes(" or ")) {
      options = inputStr.split(/\s+or\s+/i).map((o) => o.trim()).filter((o) => o.length > 0);
    } else {
      // Try splitting by spaces as fallback
      options = inputStr.split(/\s+/).filter((o) => o.length > 0);
    }

    if (options.length < 2) {
      return "❌ Gabe needs at least 2 options to choose from. That's how choices work.";
    }

    if (options.length > 20) {
      return "❌ Too many options! Gabe's attention span maxes out at 20. Narrow it down.";
    }

    const mode = this.getOptionString("mode") ?? "normal";

    // Chaos mode - 15% chance of chaotic response
    if (mode === "chaos" && Math.random() < 0.15) {
      const chaosType = Math.floor(Math.random() * 3);

      if (chaosType === 0) {
        // Pick both/all
        const picks = options.slice(0, Math.min(3, options.length));
        return `🎲 **Gabe's Choice**\n\n${ChooseCommand.chaosReactions[0]}\n\n✨ **${picks.join(" AND ")}**`;
      } else if (chaosType === 1) {
        // Make up a new option
        const madeUp = random(ChooseCommand.madeUpOptions);
        return `🎲 **Gabe's Choice**\n\n${ChooseCommand.chaosReactions[1]}\n\n✨ **${madeUp}**\n\n*Your options were too boring.*`;
      } else {
        // Refuse to choose
        return `🎲 **Gabe's Choice**\n\n${ChooseCommand.chaosReactions[2]}\n\n🚪 *You're on your own, buddy.*`;
      }
    }

    // Normal selection
    const choice = random(options);
    const reaction = random(ChooseCommand.reactions);

    // Build the options display
    const optionsDisplay = options.map((o, i) => `${i + 1}. ${o}`).join("\n");

    return `🎲 **Gabe's Choice**${mode === "chaos" ? " (Chaos Mode)" : ""}

**Options:**
${optionsDisplay}

${reaction}

✨ **${choice}**`;
  }

  static flags = [
    {
      name: "options",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Comma or 'or' separated options (e.g., 'pizza, tacos' or 'pizza or tacos')",
      required: true,
      classic: true,
    },
    {
      name: "mode",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Decision mode",
      choices: [
        { name: "Normal", value: "normal" },
        { name: "Chaos Mode (unpredictable)", value: "chaos" },
      ],
      classic: true,
    },
  ];

  static description = "Let Gabe make a decision for you (he's very wise... sometimes)";
  static aliases = ["pick", "decide", "select", "choice"];
}

export default ChooseCommand;
