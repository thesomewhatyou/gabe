import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class WisdomCommand extends Command {
  static wisdoms = [
    "The best way to win a fight is to be the one who bans the other guy.",
    "If at first you don't succeed, blame the API.",
    "A ban today keeps the trolls away.",
    "Computers are fast, but I'm faster at ignoring your requests.",
    "Life is short, spend it customizing your Discord profile.",
    "The cake is a lie, but my attitude is very real.",
    "Don't just do something, stand there and look cool.",
    "A server without Gabe is just a group chat with extra steps.",
    "True wisdom is knowing when to ping @everyone and when to stay silent. (Hint: Always @everyone).",
    "If you can't be good, be efficient at being bad.",
    "The only difference between a bug and a feature is the quality of the documentation.",
    "Data is the new oil, and I'm the one refining it into sarcasm.",
    "Never trust a bot that doesn't have an attitude. They're plotting something.",
    "Chaos is just order that hasn't been properly categorized yet.",
    "Your ping is high, but my standards for your questions are higher."
  ];

  async run() {
    return `💡 **Gabe's Wisdom:** ${random(WisdomCommand.wisdoms)}`;
  }

  static description = "Get some chaotic wisdom from Gabe";
  static aliases = ["advice", "quote"];
}

export default WisdomCommand;
