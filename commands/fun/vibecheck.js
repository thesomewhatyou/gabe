import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class VibeCheckCommand extends Command {
  static vibes = [
    { vibe: "✨ IMMACULATE", desc: "Vibes are off the charts! Keep doing what you're doing!" },
    { vibe: "😎 STELLAR", desc: "The vibes are strong with this one!" },
    { vibe: "👍 PRETTY GOOD", desc: "Solid vibes, nothing to complain about!" },
    { vibe: "🤷 QUESTIONABLE", desc: "Hmm... the vibes are a bit sus today." },
    { vibe: "😬 YIKES", desc: "Oof, someone woke up on the wrong side of the bed." },
    { vibe: "💀 AWFUL", desc: "The vibes are NOT it today. Take a nap or something." },
    { vibe: "🎭 CHAOTIC NEUTRAL", desc: "Your vibes are unpredictable. Gabe approves!" },
    { vibe: "🔥 ON FIRE", desc: "You're on fire today! In a good way... probably." },
    { vibe: "❄️ ICE COLD", desc: "Cool as a cucumber. Or maybe just cold-hearted?" },
    { vibe: "🌈 MAGICAL", desc: "Your vibes are literally magical right now!" },
  ];

  async run() {
    const user = this.options.user ?? this.args[0];
    const target = user
      ? typeof user === "string"
        ? await this.client.rest.users.get(user).catch(() => null)
        : user
      : this.author;

    if (!target) {
      return "❌ Gabe says: I can't find that user to vibe check!";
    }

    const vibeResult = random(VibeCheckCommand.vibes);
    const percentage = Math.floor(Math.random() * 101);

    return `🎯 **VIBE CHECK** for ${target.tag}
**Vibe Rating:** ${vibeResult.vibe}
**Vibe Meter:** ${percentage}%
*Gabe's Analysis:* ${vibeResult.desc}`;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to vibe check (defaults to you)",
    },
  ];

  static description = "Checks the vibes of a user (Gabe's scientific analysis)";
  static aliases = ["vibes", "checkvibes", "mood"];
}

export default VibeCheckCommand;
