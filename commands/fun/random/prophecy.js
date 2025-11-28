import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class ProphecyCommand extends Command {
  static openers = [
    "Gabe peers into his cracked crystal ball and sees {focus}.",
    "A stray packet from the future pings Gabe about {focus}.",
    "The caffeine spirits whisper a warning involving {focus}.",
    "Gabe flips a tarot card made of patch notes and it screams about {focus}.",
    "An eldritch toaster pops up toast branded with {focus}.",
  ];

  static events = [
    "{focus} accidentally schedules three meetings with themselves and attends all of them.",
    "{focus} becomes the main character of #general for eight whole minutes.",
    '{focus} finds the legendary snack stash, but it\'s labeled "do not microwave".',
    "{focus} inspires a reaction role nobody asked for.",
    "{focus} launches a side quest that somehow fixes the Wi-Fi.",
    '{focus} unironically says "let me cook" and the timeline trembles.',
    "{focus} writes a to-do list, loses it, and still completes it out of spite.",
    "{focus} starts typing a rant and accidentally invents a manifesto.",
  ];

  static twists = [
    "Destiny footnote: expect applause, confusion, and one slow clap from Gabe.",
    "Plot twist: a single perfectly timed gif prevents disaster.",
    "Meanwhile, three servers away, someone feels secondhand chaos.",
    "Outcome: autocorrect refuses to help, so fate ships with typos.",
    "Resolution: credits roll while confetti cannons misfire.",
  ];

  static actions = [
    "Action item: hydrate before destiny does.",
    "Action item: back up your memes immediately.",
    "Action item: pretend this was your plan all along.",
    "Action item: queue a celebratory playlist just in case.",
    "Action item: mute and unmute yourself for dramatic flair.",
    "Action item: craft a reaction gif arsenal.",
  ];

  static flags = [
    {
      name: "topic",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "What should Gabe focus the prophecy on? (defaults to you)",
      classic: true,
    },
  ];

  static description = "Receive a dramatic, chaotic prophecy direct from Gabe";
  static aliases = ["vision", "future", "omen"];

  static cleanTopic(input) {
    if (!input || typeof input !== "string") return undefined;
    const trimmed = input.trim().replace(/\s+/g, " ");
    if (trimmed === "") return undefined;
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  }

  static fill(template, focus) {
    return template.replaceAll("{focus}", focus);
  }

  async run() {
    const optionTopic = this.getOptionString("topic");
    const fallbackTopic = this.args?.length ? this.args.join(" ") : undefined;
    const cleaned = ProphecyCommand.cleanTopic(optionTopic ?? fallbackTopic);
    const focus = cleaned ?? "you";
    const displayFocus = focus === "you" ? "you" : `**${focus}**`;

    const lines = [
      "🔮 **Gabe's Chaotic Prophecy**",
      ProphecyCommand.fill(random(ProphecyCommand.openers), displayFocus),
      ProphecyCommand.fill(random(ProphecyCommand.events), displayFocus),
      ProphecyCommand.fill(random(ProphecyCommand.twists), displayFocus),
      random(ProphecyCommand.actions),
    ];

    return lines.join("\n");
  }
}

export default ProphecyCommand;
