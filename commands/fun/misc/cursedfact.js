import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class CursedFactCommand extends Command {
  static facts = [
    "Your skeleton is wet.",
    "If you smell something, it's because particles of that thing are touching the inside of your nose.",
    "There are mites living in your eyelashes right now.",
    "When you blush, your stomach lining also turns red.",
    "A raccoon can fit into holes 4 inches wide. Your rectum can stretch up to 8 inches.",
    "During cremation, the meat is perfectly cooked at some point.",
    "Your teeth are the only part of your skeleton that you can clean.",
    "If you keep your eyes open while sneezing, they won't pop out, but your blood vessels might rupture.",
    "Most toilet paper has trace amounts of arsenic.",
    "You produce enough saliva in your lifetime to fill two swimming pools.",
    "There is a species of jellyfish that is biologically immortal.",
    "Butterflies will drink blood if given the chance.",
    "Your bed has between 100,000 and 10 million dust mites.",
    "Fir trees can grow in human lungs.",
    "Horned lizards squirt blood from their eyes as a defense mechanism.",
    "A human head remains conscious for about 20 seconds after being decapitated.",
    "You shed about 40 pounds of skin in your lifetime.",
    "There are more bacteria in your mouth than there are people on Earth.",
    "When you die, your hearing is the last sense to go.",
    "Sloths can hold their breath longer than dolphins.",
    "Bananas are radioactive.",
    "Your brain eats itself if you don't sleep enough."
  ];

  async run() {
    return `💀 **Did you know?**\n${random(CursedFactCommand.facts)}`;
  }

  static description = "Learn something you wish you didn't know";
  static aliases = ["cursedfact", "disturbingfact", "ruinmyday"];
  static dbRequired = false;
  static cooldown = 3;
}

export default CursedFactCommand;
