import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CoinflipCommand extends Command {
  static headsMessages = [
    "The coin landed on **HEADS**!",
    "It's **HEADS**! Gravity has spoken.",
    "**HEADS** wins! The coin has decided.",
    "Flipped... and it's **HEADS**!",
    "**HEADS**! Better luck next time, tails.",
  ];

  static tailsMessages = [
    "The coin landed on **TAILS**!",
    "It's **TAILS**! Fate has chosen.",
    "**TAILS** wins! The coin knows all.",
    "Flipped... and it's **TAILS**!",
    "**TAILS**! Heads never had a chance.",
  ];

  async run() {
    const mode = this.options.mode ?? this.args[0];

    // Chaos mode - includes edge case
    if (mode === "chaos") {
      const roll = Math.random() * 100;

      // 0.5% chance of edge
      if (roll < 0.5) {
        return `🪙 **COIN FLIP - CHAOS MODE**
🌀 The coin spins through the air...
✨ **IT LANDED ON ITS EDGE**

⚠️ *Reality has been compromised.*
⚠️ *The laws of physics are merely suggestions.*
⚠️ *Gabe is confused. The coin is confused. You are confused.*

🎰 Achievement Unlocked: "Defying Probability" (0.5% chance)`;
      }

      // 49.75% heads, 49.75% tails
      const result = roll < 50 ? "heads" : "tails";
      const messages = result === "heads" ? CoinflipCommand.headsMessages : CoinflipCommand.tailsMessages;
      const message = messages[Math.floor(Math.random() * messages.length)];

      return `🪙 **COIN FLIP - CHAOS MODE**
🌀 The coin spins chaotically through the air...
${message}
// you are lucky as SHIT if you got this
*Gabe says: You got lucky. It could've been the edge.*`;
    }

    // Normal mode - simple 50/50
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const messages = result === "heads" ? CoinflipCommand.headsMessages : CoinflipCommand.tailsMessages;
    const message = messages[Math.floor(Math.random() * messages.length)];

    return `🪙 **COIN FLIP**
${message}`;
  }

  static flags = [
    {
      name: "mode",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Flip mode (normal or chaos)",
      choices: [
        { name: "Normal Flip", value: "normal" },
        { name: "Chaos Mode (edge possible)", value: "chaos" },
      ],
      classic: true,
    },
  ];

  static description = "Flip a coin (Gabe's RNG, chaos mode available)";
  static aliases = ["flip", "coin", "heads", "tails"];
}

export default CoinflipCommand;
