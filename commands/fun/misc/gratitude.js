import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanJoyInput, seededPick } from "#utils/joy.js";

class GratitudeCommand extends Command {
  static prompts = [
    "a person who made today easier",
    "one small thing that worked",
    "a comfort you forget is not guaranteed",
    "something you learned recently",
    "a tiny win nobody else saw",
    "a place that lets your brain unclench",
    "a song snack or joke that helped",
  ];

  static closers = [
    "gabe adds this to the good pile",
    "small joy logged successfully",
    "gratitude meter wiggled upward",
    "tiny light detected",
    "noted with unnecessary confidence",
  ];

  static description = "Make a tiny gratitude note with Gabe";
  static aliases = ["thanks", "thankful", "goodthing", "grateful"];

  static flags = [
    {
      name: "thing",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Something good to be grateful for",
      classic: true,
    },
  ];

  static cleanThing(input) {
    return cleanJoyInput(input, 120);
  }

  static pick(seed, list) {
    return seededPick(seed, list, "gratitude");
  }

  static build(seed, thing) {
    const cleaned = GratitudeCommand.cleanThing(thing);
    return {
      thing: cleaned,
      prompt: cleaned ? undefined : GratitudeCommand.pick(`${seed}:prompt`, GratitudeCommand.prompts),
      closer: GratitudeCommand.pick(`${seed}:closer`, GratitudeCommand.closers),
    };
  }

  async run() {
    const optionThing = this.getOptionString("thing");
    const fallbackThing = this.args?.length ? this.args.join(" ") : undefined;
    const note = GratitudeCommand.build(this.author.id, optionThing ?? fallbackThing);

    return [
      "**gabe gratitude note**",
      note.thing ? `today we appreciate: ${note.thing}` : `prompt: name ${note.prompt}`,
      note.closer,
    ].join("\n");
  }
}

export default GratitudeCommand;
