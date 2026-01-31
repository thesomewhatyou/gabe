import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class ExcuseCommand extends Command {
  static reasons = [
    "I was busy fighting a swarm of digital bees.",
    "My keyboard decided to go on a strike.",
    "I accidentally joined a secret society of toaster enthusiasts.",
    "My internet was being held hostage by a very demanding cat.",
    "I was busy explaining the plot of Kingdom Hearts to my houseplants.",
    "I got stuck in a time loop, but only for five minutes.",
    "My computer's fans started playing the Tetris theme and I had to listen.",
    "I was busy teaching my goldfish how to play Minesweeper.",
    "I fell into a rabbit hole of conspiracy theories about pigeons.",
    "My chair was too comfortable and I couldn't stand up.",
    "I was trying to solve a Rubik's cube in the dark.",
    "A rogue squirrel disconnected my router.",
    "I was busy debating whether a hot dog is a sandwich.",
    "My monitor decided it only wanted to display shades of beige.",
    "I was waiting for my code to compile, and it's still compiling.",
    "I got distracted by a very interesting cloud.",
    "My mouse ran away to join the circus.",
    "I was busy translating the entire Discord TOS into Emoji.",
    "A localized black hole formed in my kitchen, had to deal with that.",
    "I was busy debugging my life, but I found too many dependencies.",
  ];

  static openers = [
    "Sorry, {focus}, but {reason}",
    "I can't believe I'm saying this, {focus}, but {reason}",
    "Listen {focus}, {reason}",
    "Gabe's official report for {focus}: {reason}",
    "Fate intervened for {focus}: {reason}",
    "You won't believe it, {focus}: {reason}",
  ];

  async run() {
    const user = this.getOptionUser("who");
    const target = user ?? this.author;
    const focus = target.mention;

    const reason = random(ExcuseCommand.reasons);
    const opener = random(ExcuseCommand.openers);

    return opener.replace("{focus}", focus).replace("{reason}", reason);
  }

  static flags = [
    {
      name: "who",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "User who needs an excuse (defaults to you)",
      classic: true,
    },
  ];

  static description = "Generate a chaotic excuse for any situation";
  static aliases = ["reason", "sorry", "why"];
}

export default ExcuseCommand;
