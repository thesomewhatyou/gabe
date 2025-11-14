import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class TouchGrassCommand extends Command {
  static messages = [
    "Please go outside. The sun misses you.",
    "When was the last time you felt the touch of grass? Seriously.",
    "Grass. Touch it. Now.",
    "Go outside and touch grass. Doctor's orders.",
    "Your Vitamin D levels are concerning. Touch grass.",
    "The grass isn't going to touch itself. Go outside.",
    "I'm begging you. Please. Just go outside for 5 minutes.",
    "Nature called. It wants you to touch grass.",
    "Breaking news: Local Discord user hasn't seen sunlight since 2019",
    "Prescription: 30 minutes of touching grass, twice daily",
  ];

  static gifs = [
    "https://tenor.com/view/go-outside-touch-grass-gif-24127138",
    "https://tenor.com/view/touch-grass-gif-21979297",
    "https://tenor.com/view/touch-grass-meme-gif-25188504",
  ];

  async run() {
    const target = this.getOptionUser("user");
    const message = random(TouchGrassCommand.messages);
    const gif = random(TouchGrassCommand.gifs);

    const content = target ? `${target.mention}, ${message}` : message;

    return {
      content: `🌱 ${content}`,
      embeds: [
        {
          color: 0x00ff00,
          image: {
            url: gif,
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Tell someone to touch grass",
      required: false,
    },
  ];

  static description = "Tell someone (or yourself) to go outside and touch grass";
  static aliases = ["grass", "outside", "gooutside", "sunlight"];
}

export default TouchGrassCommand;
