import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class GabeCommand extends Command {
  static responses = [
    "What do you want? I'm busy being awesome.",
    "Gabe's here! Your server just got 10x cooler.",
    "I'm your pal... unless you annoy me. Then I'm your worst enemy.",
    "You called? Better be important.",
    "I'm Gabe. I do images, music, moderation, and attitude. What can't I do?",
    "Hey there! Ready to cause some chaos?",
    "Gabe reporting for duty. What's the mission?",
    "I'm multifunctional baby! Images? Check. Music? Check. Banning annoying people? Double check!",
    "Some bots are nice. Some bots are mean. I'm both. Deal with it.",
    "You rang? Gabe's listening... probably.",
    "I'm like a Swiss Army knife, but for Discord. And with more personality.",
    "Your friendly neighborhood chaos bot at your service!",
    "I can be your best friend or your worst nightmare. Choose wisely.",
    "Gabe's the name, Discord shenanigans is the game!",
    "Multifunctional and full of attitude. That's me!",
  ];

  async run() {
    return `🤖 ${random(GabeCommand.responses)}`;
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
