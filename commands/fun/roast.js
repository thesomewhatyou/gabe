import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class RoastCommand extends Command {
  static roasts = [
    "You're like a software update—nobody likes you, but you show up anyway.",
    "I'd explain it to you, but I left my crayons at home.",
    "You're the reason shampoo has instructions.",
    "I'd agree with you, but then we'd both be wrong.",
    "You bring everyone so much joy... when you leave the room.",
    "I'm not saying you're stupid, I'm just saying you've got bad luck when it comes to thinking.",
    "If I wanted to hear from someone like you, I'd scrape my keyboard.",
    "You're like a cloud. When you disappear, it's a beautiful day.",
    "I'd call you a tool, but that would imply you're actually useful.",
    "You're proof that evolution CAN go in reverse.",
    "I'm jealous of all the people who haven't met you.",
    "You're like a participation trophy—everyone gets one, but nobody's proud of it.",
    "If brains were dynamite, you wouldn't have enough to blow your nose.",
    "You're the human equivalent of a software bug that never gets fixed.",
    "I'd challenge you to a battle of wits, but I don't fight unarmed opponents.",
    "You're like a broken pencil—completely pointless.",
    "If you were any more inbred, you'd be a sandwich.",
    "You have the perfect face for radio.",
    "I'd say you're unique, but so is every pile of trash.",
    "You're living proof that practice doesn't always make perfect.",
  ];

  async run() {
    const target = this.getOptionUser("user");
    const roast = random(RoastCommand.roasts);

    if (target && target.id !== this.author.id) {
      return `🔥 ${target.mention}, ${roast}`;
    } else if (target && target.id === this.author.id) {
      return `🔥 ${this.author.mention}, you asked for it: ${roast}`;
    } else {
      return `🔥 ${roast}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to roast (leave empty for a random roast)",
      required: false,
    },
  ];

  static description = "Gabe roasts someone (or just gives a random roast)";
  static aliases = ["burn", "flame", "insult"];
}

export default RoastCommand;
