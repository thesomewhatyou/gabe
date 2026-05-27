import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class GabeCommand extends Command {
  static responses = [
    "gabe here. server instantly more powerful.",
    "you called and gabe arrived with good vibes and questionable tools.",
    "gabe can do images music moderation games and tiny miracles.",
    "today gabe chooses joy and maybe a little chaos.",
    "gabe reporting for duty. mission accepted if mission is fun.",
    "your friendly neighborhood feature pile is awake.",
    "gabe status: online happy and probably holding a wrench.",
    "server vibe improved by at least 12 percent.",
    "gabe believes in you. scary but true.",
    "images check. music check. moderation check. silly little joy check.",
    "gabe is listening and only slightly dramatic.",
    "hello yes this is gabe customer support for delight.",
    "gabe brings the buttons the bits and the bounce.",
    "tiny bot big heart dangerous amount of image processing.",
    "gabe says keep going. you are cooking.",
  ];

  async run() {
    const mood = this.getOptionString("mood");
    if (mood === "friend") return "yes. gabe is your friend and also your backup chaos engine.";
    if (mood === "abilities") {
      return "gabe does image edits music moderation tags battles economy tools and fun commands. use help and go wild.";
    }
    if (mood === "mood") return "gabe mood is bright. little sleepy. extremely ready.";

    return random(GabeCommand.responses);
  }

  static flags = [
    {
      name: "mood",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Ask about Gabe's mood",
      choices: [
        { name: "How are you feeling?", value: "mood" },
        { name: "Are you my friend?", value: "friend" },
        { name: "What can you do?", value: "abilities" },
      ],
      classic: true,
    },
  ];

  static description = "Talk to Gabe and learn about this chaotic bot";
  static aliases = ["about", "whoisgabe", "hey"];
}

export default GabeCommand;
