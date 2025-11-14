import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class RandomQuoteCommand extends Command {
  static quotes = [
    { text: "This wall tastes like wall", gif: null },
    { text: "I'm not saying I'm a genius, but I've never seen me and a genius in the same room", gif: null },
    { text: "The floor here is made out of floor", gif: null },
    { text: "Every 60 seconds in Africa, a minute passes", gif: null },
    { text: "I once tried to count to infinity. I got to 7.", gif: null },
    { text: "Water is just boneless ice", gif: null },
    { text: "If you close your eyes, you can't see", gif: null },
    { text: "I'm not lazy, I'm just on energy saving mode", gif: null },
    { text: "Bread is just raw toast", gif: null },
    { text: "The ocean is just a really big puddle", gif: null },
    { text: "Bones are just spicy rocks inside you", gif: null },
    { text: "Sleep is just a free trial of death", gif: null },
    { text: "Biting your tongue while eating is the perfect example of how you can still screw up even with decades of experience", gif: null },
    { text: "If you rearrange the letters in 'Postmen', you get 'Not Meps'", gif: null },
    { text: "The mitochondria is the powerhouse of the cell", gif: null },
    { text: "I'm approximately 11 minutes older than I was 11 minutes ago", gif: null },
    { text: "Air is just crunchy water without the crunch or the water", gif: null },
    { text: "Trees are just inverted lungs", gif: null },
    { text: "Your skeleton is always wet", gif: null },
    { text: "Clapping is just hitting yourself because you like something", gif: null },
    { text: "*metal pipe falling sound*", gif: "https://tenor.com/view/metal-pipe-falling-gif-26220827" },
    { text: "*vine boom*", gif: "https://tenor.com/view/vine-boom-gif-25087287" },
    { text: "It is what it is", gif: "https://tenor.com/view/it-is-what-it-is-gif-23620304" },
    { text: "Why is it called oven when you of in the cold food of out hot eat the food?", gif: null },
    { text: "I don't have trust issues, I have trust solutions", gif: null },
    { text: "If you think about it, your alarm clock is just someone screaming at you to start the daily grind", gif: null },
    { text: "Whoever invented the knock-knock joke deserves a no-bell prize", gif: null },
    { text: "I'm not procrastinating, I'm doing side quests", gif: null },
    { text: "Technically, all plants are edible. Some just only once.", gif: null },
    { text: "The word 'bed' looks like a bed", gif: null },
    { text: "Your teeth are the only bones you clean and show off to people", gif: null },
    { text: "You've never actually seen your own face, only pictures and reflections", gif: null },
    { text: "Saying 'Forward' backwards is 'Drawrof' which sounds like 'drawer of'", gif: null },
    { text: "You're not stuck in traffic. You ARE traffic.", gif: null },
    { text: "A different version of you exists in the minds of everyone who knows you", gif: null },
    { text: "If you're waiting for a waiter, aren't you the waiter?", gif: null },
    { text: "Firetrucks are actually watertrucks", gif: null },
    { text: "Your future self is watching you right now through memories", gif: null },
    { text: "The brain named itself", gif: null },
    { text: "You can't stand backwards on stairs", gif: null },
  ];

  async run() {
    const quote = random(RandomQuoteCommand.quotes);

    if (quote.gif) {
      return {
        content: `💭 **Random Wisdom:** ${quote.text}`,
        embeds: [
          {
            color: 0xff0000,
            image: {
              url: quote.gif,
            },
          },
        ],
      };
    }

    return `💭 **Random Wisdom:** ${quote.text}`;
  }

  static description = "Gabe shares completely useless wisdom and stupid memes";
  static aliases = ["quote", "wisdom", "deepthought", "showerthought", "randomshit"];
}

export default RandomQuoteCommand;
