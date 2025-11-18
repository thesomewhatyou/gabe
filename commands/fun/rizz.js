import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class RizzCommand extends Command {
  static pickupLines = [
    "Are you a Discord webhook? Because you just posted straight to my heart.",
    "Are you a git merge conflict? Because I can't resolve my feelings for you.",
    "Is your name WiFi? Because I'm feeling a strong connection.",
    "Are you a compiler? Because you turn my code into something beautiful.",
    "You must be a keyboard, because you're just my type.",
    "Are you a bug? Because I can't stop thinking about you even when I should be fixing you.",
    "Are you localhost? Because I'd like to connect to you.",
    "If you were a Discord role, you'd be @everyone because you matter to everyone here.",
    "Are you a stack overflow? Because you've exceeded my memory limits.",
    "You're like my favorite Discord server - I always want to be online with you.",
    "Are you a database query? Because you've selected * from my heart.",
    "If you were a programming language, you'd be Python - because you're making my heart snake around.",
    "Are you dark mode? Because you're easy on the eyes.",
    "You must be asynchronous, because you've got me waiting on a promise.",
    "Are you a Discord ping? Because you've got my full attention now.",
    "I must be a cache, because I can't stop storing memories of you.",
    "Are you a VPN? Because you make me feel secure.",
    "If love was a Git repo, I'd commit to our relationship.",
    "Are you a Discord Nitro subscription? Because you're premium quality.",
    "You're like perfect code - no bugs, just features.",
  ];

  static cringeLines = [
    "Are you a Discord server? Because I'd like to slide into your DMs.",
    "Call me a bot, because I'm programmed to love you.",
    "Are you a Discord mod? Because you've got me muted with your beauty.",
    "I'd rewrite my entire codebase just to debug my way into your heart.",
    "You're hotter than a CPU running Cyberpunk on max settings.",
    "Are you a firewall? Because you're blocking my attempts to ping you.",
    "If we were in a voice channel together, I'd never disconnect.",
    "Are you JavaScript? Because I can't predict what you'll do next, but I love it.",
    "You must be a rare drop, because finding someone like you is a 0.01% chance.",
    "Are you a Discord embed? Because you've got me feeling colorful inside.",
    "Are you a diamond block? Cuz I mine you.",
    "Can I cum in yo mouth",
  ];

  async run() {
    const mode = this.options.mode ?? this.args[0] ?? "normal";

    let line;
    if (mode === "cringe" || mode === "max") {
      line = random(RizzCommand.cringeLines);
    } else {
      line = random(RizzCommand.pickupLines);
    }

    const rizzScore = Math.floor(Math.random() * 101);

    // Rare legendary response
    if (Math.random() < 0.01) {
      return `✨ **LEGENDARY RIZZ UNLOCKED**
💬 "${line}"
📊 Rizz Score: ${rizzScore}/100
🎰 *Critical hit! This one might actually work...*`;
    }

    // Self-awareness for terrible rizz
    if (rizzScore < 20) {
      return `😬 **Gabe's Rizz Generator**
💬 "${line}"
📊 Rizz Score: ${rizzScore}/100
⚠️ *Gabe says: Don't actually use this. Touch grass first.*`;
    }

    return `💖 **Gabe's Rizz Generator**
💬 "${line}"
📊 Rizz Score: ${rizzScore}/100`;
  }

  static flags = [
    {
      name: "mode",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Rizz mode (normal or cringe)",
      choices: [
        { name: "Normal Rizz", value: "normal" },
        { name: "Maximum Cringe", value: "cringe" },
      ],
      classic: true,
    },
  ];

  static description = "Generate pickup lines (Gabe's rizz factory)";
  static aliases = ["pickupline", "flirt", "charm"];
}

export default RizzCommand;
