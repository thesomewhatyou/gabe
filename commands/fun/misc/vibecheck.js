import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { currentDayKey, resolveJoyUser, seededPick } from "#utils/joy.js";

class VibecheckCommand extends Command {
  static levels = [
    { max: 12, name: "sleepy", note: "soft launch mode. still valid. needs water and one good song." },
    { max: 29, name: "wobbly", note: "vibes wobble but do not fall. gabe recommends snacks." },
    { max: 49, name: "decent", note: "solid middle shelf energy. dependable. microwave safe probably." },
    { max: 69, name: "sparkly", note: "good glow detected. chat may become slightly more powerful." },
    { max: 86, name: "radiant", note: "joy levels high. gabe is nodding like this was obvious." },
    { max: 100, name: "legendary", note: "massive happy aura. legally too cheerful to nerf." },
  ];

  static boosts = [
    "today bonus: +3 for immaculate posting posture",
    "today bonus: +5 because gabe believes in the bit",
    "today bonus: +7 for surviving the timeline",
    "today bonus: +4 for mysterious main character weather",
    "today bonus: +6 for bringing good room temperature chaos",
  ];

  static advice = [
    "mission: send one nice message and make the server brighter",
    "mission: hydrate then do something mildly iconic",
    "mission: pick a song and walk like end credits are rolling",
    "mission: compliment a friend before the vibe expires",
    "mission: keep cooking. carefully. with style.",
  ];

  static description = "Checks the vibes of a user with gabe science";
  static aliases = ["vibe", "vibes", "joycheck", "happycheck"];

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who should Gabe vibecheck? (defaults to you)",
      classic: true,
    },
  ];

  static score(seed) {
    let hash = 17;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 33 + seed.charCodeAt(i)) % 1000003;
    }
    return hash % 101;
  }

  static tier(score) {
    return VibecheckCommand.levels.find((level) => score <= level.max) ?? VibecheckCommand.levels.at(-1);
  }

  static pick(seed, list) {
    return seededPick(seed, list, "vibecheck");
  }

  static bar(score) {
    return "#".repeat(Math.round(score / 10)).padEnd(10, "-");
  }

  static build(seed) {
    const score = VibecheckCommand.score(seed);
    const tier = VibecheckCommand.tier(score);

    return {
      score,
      tier,
      bar: VibecheckCommand.bar(score),
      boost: VibecheckCommand.pick(`${seed}:boost`, VibecheckCommand.boosts),
      advice: VibecheckCommand.pick(`${seed}:advice`, VibecheckCommand.advice),
    };
  }

  async resolveClassicUser() {
    return resolveJoyUser(this);
  }

  async run() {
    const target = this.getOptionUser("user") ?? (await this.resolveClassicUser()) ?? this.author;
    const vibe = VibecheckCommand.build(`${target.id}:${currentDayKey()}`);

    return [
      `**gabe vibecheck for <@${target.id}>**`,
      `vibe meter: ${vibe.bar} ${vibe.score}%`,
      `rank: ${vibe.tier.name}`,
      vibe.tier.note,
      vibe.boost,
      vibe.advice,
    ].join("\n");
  }
}

export default VibecheckCommand;
