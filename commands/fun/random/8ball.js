import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class EightBallCommand extends Command {
  static positiveResponses = [
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "Yes, definitely.",
    "You may rely on it.",
    "As I see it, yes.",
    "Most likely.",
    "Outlook good.",
    "Yes.",
    "Signs point to yes.",
  ];

  static neutralResponses = [
    "Reply hazy, try again.",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now.",
    "Concentrate and ask again.",
  ];

  static negativeResponses = [
    "Don't count on it.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Very doubtful.",
  ];

  static gabeResponses = [
    "Bro, even I don't know. And I know everything.",
    "The spirits say... touch grass.",
    "Ask me again when you're not being cringe.",
    "Magic 8-ball machine broke. Try the coinflip instead.",
    "I'm gonna be real with you chief... no.",
    "The universe says yes, but Gabe says maybe.",
    "Absolutely. Wait, what was the question?",
    "My sources (trust me bro) say yes.",
    "That's a solid 'lmao no' from me.",
    "Signs point to you needing to go outside.",
  ];

  async run() {
    const question = this.options.question ?? this.args.join(" ");
    const mode = this.options.mode ?? "classic";

    if (!question || question.trim().length === 0) {
      return "🎱 You gotta ask a question first, genius.";
    }

    let response;
    let emoji;

    if (mode === "gabe") {
      // Gabe mode - chaotic responses
      response = EightBallCommand.gabeResponses[Math.floor(Math.random() * EightBallCommand.gabeResponses.length)];
      emoji = "😈";
    } else {
      // Classic mode - traditional 8-ball distribution
      const roll = Math.random() * 100;

      if (roll < 50) {
        // 50% positive
        response = EightBallCommand.positiveResponses[Math.floor(Math.random() * EightBallCommand.positiveResponses.length)];
        emoji = "✅";
      } else if (roll < 75) {
        // 25% neutral
        response = EightBallCommand.neutralResponses[Math.floor(Math.random() * EightBallCommand.neutralResponses.length)];
        emoji = "🤔";
      } else {
        // 25% negative
        response = EightBallCommand.negativeResponses[Math.floor(Math.random() * EightBallCommand.negativeResponses.length)];
        emoji = "❌";
      }
    }

    return `🎱 **Magic 8-Ball** ${mode === "gabe" ? "(Gabe Mode)" : ""}

**Question:** ${question}

${emoji} **${response}**`;
  }

  static flags = [
    {
      name: "question",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Your yes/no question for the 8-ball",
      required: true,
      classic: true,
    },
    {
      name: "mode",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Response mode",
      choices: [
        { name: "Classic 8-Ball", value: "classic" },
        { name: "Gabe Mode (chaotic)", value: "gabe" },
      ],
      classic: true,
    },
  ];

  static description = "Ask the Magic 8-Ball a yes/no question";
  static aliases = ["8ball", "eightball", "magic8ball", "fortune"];
}

export default EightBallCommand;
