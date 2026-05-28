import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanJoyInput, currentDayKey, resolveJoyUser, seededPick } from "#utils/joy.js";

class CheerCommand extends Command {
  static chants = [
    "tiny victory tiny victory tiny victory",
    "we believe in the bit and the person doing it",
    "go team go but like in a calm sustainable way",
    "one more step one more spark one more win",
    "the room is now legally required to be supportive",
    "big heart small task clean landing",
    "today's forecast says extremely possible",
    "the comeback arc has entered the building",
  ];

  static actions = [
    "drop one encouraging line in chat",
    "react to the next good update like it matters",
    "make the next step smaller and louder",
    "celebrate the effort before the result arrives",
    "turn nervous energy into a five minute start",
    "send backup instead of advice unless advice is requested",
    "make space for the win even if it is tiny",
    "call out the progress nobody noticed yet",
  ];

  static closers = [
    "gabe has started the cheer section",
    "morale is now wearing comfy shoes",
    "support beam installed",
    "chat warmth increased by one notch",
    "this is now a certified hype zone",
  ];

  static description = "Start a warm Gabe cheer for someone or something";
  static aliases = ["rally", "rootfor", "support", "hypeup"];

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who should Gabe cheer for? (optional)",
      classic: true,
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "What are we cheering for?",
      classic: true,
    },
  ];

  static cleanReason(input) {
    return cleanJoyInput(input, 100);
  }

  static pick(seed, list) {
    return seededPick(seed, list, "cheer");
  }

  static build(seed, reason) {
    const reasonSeed = reason ?? "today";
    return {
      reason,
      chant: CheerCommand.pick(`${seed}:chant:${reasonSeed}`, CheerCommand.chants),
      action: CheerCommand.pick(`${seed}:action:${reasonSeed}`, CheerCommand.actions),
      closer: CheerCommand.pick(`${seed}:closer:${reasonSeed}`, CheerCommand.closers),
    };
  }

  async resolveClassicUser() {
    return resolveJoyUser(this);
  }

  async run() {
    const hasUserFlag = typeof this.options?.user === "string";
    const optionTarget = this.getOptionUser("user");
    const classicTarget = optionTarget ? undefined : await this.resolveClassicUser();
    const target = optionTarget ?? classicTarget;
    const optionReason = this.getOptionString("reason");
    const consumedFirstArg = Boolean(target) && !hasUserFlag && !optionTarget;
    const fallbackReason = consumedFirstArg && this.args?.length ? this.args.slice(1).join(" ") : this.args?.join(" ");
    const reason = CheerCommand.cleanReason(optionReason ?? fallbackReason);
    const seed = `${this.author.id}:${target?.id ?? "everyone"}:${currentDayKey()}`;
    const cheer = CheerCommand.build(seed, reason);

    return [
      `**gabe cheer${target ? ` for <@${target.id}>` : ""}**`,
      reason ? `reason: ${reason}` : undefined,
      `chant: ${cheer.chant}`,
      `group action: ${cheer.action}`,
      cheer.closer,
    ]
      .filter(Boolean)
      .join("\n");
  }
}

export default CheerCommand;
