import Command from "#cmd-classes/command.js";

class CoinflipCommand extends Command {
  async run() {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji = result === "Heads" ? "🪙" : "🌑";

    return `${emoji} **${result}!**`;
  }

  static description = "Flips a coin - heads or tails";
  static aliases = ["flip", "coin"];
}

export default CoinflipCommand;
