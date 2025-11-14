import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class ComplimentCommand extends Command {
  static compliments = [
    "You're... tolerable. I guess.",
    "You're not the worst person I've met... this week.",
    "I suppose you have... some redeeming qualities. Somewhere.",
    "You're like a penny—not worth much, but you're still... around.",
    "I've met worse. Not many, but some.",
    "You're proof that even mistakes can be... interesting.",
    "I'd say you're one in a million, but honestly, those odds aren't great.",
    "You have a face that only a mother could... well, you know.",
    "At least you're consistent... at being mediocre.",
    "You're doing your best, and that's... something, I guess.",
    "I'm sure someone, somewhere, appreciates you. Maybe.",
    "You're like a pizza—even when you're bad, you're... still pizza.",
    "You're not completely useless. You can serve as a bad example.",
    "I'd say you light up the room, but it's more like a dim bulb.",
    "You're special. Like a participation trophy kind of special.",
    "You're like modern art—I don't get it, but someone out there probably does.",
    "You're growing on me. Like a fungus, but still.",
    "I respect your courage to keep trying despite... everything.",
    "You're unique. Just like everyone else, but you tried.",
    "Somewhere out there is a tree working hard to replace the oxygen you waste. Thank that tree.",
  ];

  async run() {
    const target = this.getOptionUser("user");
    const compliment = random(ComplimentCommand.compliments);

    if (target && target.id !== this.author.id) {
      return `💐 ${target.mention}, ${compliment}`;
    } else if (target && target.id === this.author.id) {
      return `💐 ${this.author.mention}, you need a pick-me-up? Fine. ${compliment}`;
    } else {
      return `💐 ${compliment}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to 'compliment' (Gabe style)",
      required: false,
    },
  ];

  static description = "Gabe reluctantly gives a backhanded compliment";
  static aliases = ["praise", "compliment", "nice"];
}

export default ComplimentCommand;
