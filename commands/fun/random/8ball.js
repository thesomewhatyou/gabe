import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class EightBallCommand extends Command {
  static responses = [
    "certain", // "Gabe says: Absolutely, without a doubt!"
    "decidedly", // "Gabe says: Decidedly so!"
    "withoutDoubt", // "Gabe says: Without a doubt, buddy!"
    "definitely", // "Gabe says: Definitely yes!"
    "rely", // "Gabe says: You can rely on it!"
    "seeIt", // "Gabe says: As Gabe sees it, yes!"
    "likely", // "Gabe says: Most likely!"
    "outlookGood", // "Gabe says: Outlook good, pal!"
    "yes", // "Gabe says: Yes!"
    "signs", // "Gabe says: Signs point to yes!"
    "hazy", // "Gabe says: Reply hazy, ask Gabe again!"
    "later", // "Gabe says: Ask again later, I'm busy!"
    "betterNot", // "Gabe says: Better not tell you now!"
    "cannotPredict", // "Gabe says: Cannot predict now, sorry!"
    "concentrate", // "Gabe says: Concentrate and ask Gabe again!"
    "dontCount", // "Gabe says: Don't count on it, friend!"
    "replyNo", // "Gabe says: My reply is no!"
    "sourcesNo", // "Gabe says: My sources say no!"
    "outlookBad", // "Gabe says: Outlook not so good!"
    "doubtful", // "Gabe says: Very doubtful!"
  ];

  async run() {
    return `🎱 ${this.getString(`commands.responses.8ball.${random(EightBallCommand.responses)}`)}`;
  }

  static flags = [
    {
      name: "question",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "A question you want to ask the ball",
      classic: true,
    },
  ];

  static description = "Asks Gabe's magic 8-ball a question (Gabe knows all... maybe)";
  static aliases = ["magicball", "magikball", "magic8ball", "magik8ball", "eightball", "askgabe", "decidemyfate"];
}

export default EightBallCommand;
