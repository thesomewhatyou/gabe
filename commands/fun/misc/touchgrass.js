import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class TouchGrassCommand extends Command {
  static recommendations = [
    "Go outside. Seriously. The sun misses you.",
    "Touch grass. Pet a dog. Talk to a human. In that order.",
    "Grass is a type of plant. You should touch it. Google it.",
    "Step 1: Stand up. Step 2: Go outside. Step 3: Touch grass. Step 4: You're welcome.",
    "The grass has been practicing its greeting. Go say hi.",
    "Grass location: Outside. You know, that place with the big yellow ball in the sky?",
    "Recommendation: Uninstall Discord. Just kidding. But seriously, go outside.",
    "Your screen time deserves a snack break and a little sunlight.",
    "Even Gabe goes outside sometimes. And I'm a bot.",
    "Grass is free, abundant, and way better than Discord. Try it.",
  ];

  static messages = [
    { days: 0, message: "Literally right now. You're touching grass AS WE SPEAK. Impressive." },
    { days: 1, message: "Yesterday. Not bad, not great. Could use more grass time." },
    { days: 7, message: "About a week ago. The grass is starting to forget you exist." },
    { days: 14, message: "Two weeks. The grass has filed a missing person report." },
    { days: 30, message: "A month ago. The grass saved your spot just in case." },
    { days: 90, message: "Three months. The grass has prepared a welcome-back committee." },
    { days: 180, message: "Half a year. The grass still believes in your comeback arc." },
    { days: 365, message: "A FULL YEAR. Legendary indoor streak. Outdoor sequel pending." },
  ];

  static getGrassTouchMessage(days) {
    for (let i = TouchGrassCommand.messages.length - 1; i >= 0; i -= 1) {
      if (days >= TouchGrassCommand.messages[i].days) {
        return TouchGrassCommand.messages[i].message;
      }
    }
    return TouchGrassCommand.messages[0].message;
  }

  async run() {
    const user = this.getOptionUser("user");
    const target = user ?? this.author;

    // Generate "randomized" grass touch date based on user ID
    // This creates consistent results for the same user
    let hash = 0;
    for (let i = 0; i < target.id.length; i += 1) {
      hash = (hash * 31 + target.id.charCodeAt(i)) % 2147483647;
    }

    // Convert hash to days (0-365 range)
    const daysSinceTouch = hash % 366;
    const isAuthor = target.id === this.author.id;
    const subject = isAuthor ? "You" : `<@${target.id}>`;

    const statusMessage = TouchGrassCommand.getGrassTouchMessage(daysSinceTouch);
    const recommendation = random(TouchGrassCommand.recommendations);

    // Rare easter egg for very low days
    if (daysSinceTouch === 0 && Math.random() < 0.1) {
      return `🌱 **Touch Grass Analytics**
👤 Analyzing: ${subject}
📅 Last grass touch: ${statusMessage}

✅ *Gabe's Verdict:* Actually touching grass? In THIS economy? Fake news.`;
    }

    // Build recommendation based on severity
    let urgencyEmoji = "📊";
    let verdictPrefix = "Gabe's Recommendation";

    if (daysSinceTouch > 180) {
      urgencyEmoji = "🚨";
      verdictPrefix = "URGENT ALERT";
    } else if (daysSinceTouch > 30) {
      urgencyEmoji = "⚠️";
      verdictPrefix = "Gabe's Warning";
    } else if (daysSinceTouch < 7) {
      urgencyEmoji = "✅";
      verdictPrefix = "Gabe's Approval";
    }

    return `🌱 **Touch Grass Analytics**
👤 Analyzing: ${subject}
📅 Last grass touch: ${statusMessage}
📈 Days since contact: ${daysSinceTouch} days

${urgencyEmoji} *${verdictPrefix}:* ${recommendation}`;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Check someone's grass-touching history (defaults to you)",
      classic: true,
    },
  ];

  static description = "Calculate how long since someone touched grass (Gabe's outdoor metrics)";
  static aliases = ["grass", "outside", "gooutside", "sunlight"];
}

export default TouchGrassCommand;

// touch grass right now!!!
