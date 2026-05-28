import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class DieCommand extends Command {
  static responses = [
    "you must dramatically flop onto a couch in 5 minutes",
    "you must retire from the bit for exactly 12 seconds",
    "you must vanish into a blanket and return with snacks",
    "you must become unavailable due to extreme cozy levels",
    "you must say brb and come back slightly more legendary",
    "you must collapse into a beanbag with theatrical flair",
    "you must log off from bad vibes and log into joy",
    "you must take a tiny victory lap around your room",
    "you must reboot your mood with one deep breath",
    "you must perform an emergency silly little dance",
    "you must exit the scene pursued by applause",
    "you must respawn as the same person but better hydrated",
  ];
  static description = "Receive an extremely fake dramatic Gabe exit line";
  static aliases = ["kill", "die", "commitdeath", "dye", "dieofdeath", "dramaticexit", "retire"];
  static dbRequired = false;
  static cooldown = 5;
  static cooldownMessage = "the drama needs a tiny cooldown";
  static cooldownType = "user";

  async run() {
    return `${random(DieCommand.responses)}`;
  }
}

export default DieCommand;
