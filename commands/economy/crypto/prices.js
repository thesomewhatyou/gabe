import Command from "#cmd-classes/command.js";

// Define available cryptocurrencies with their properties
export const CRYPTOS = {
  GABE: { name: "GabeCoin", emoji: "🪙", basePrice: 100, volatility: 0.05 },
  DEGEN: { name: "DegenToken", emoji: "🎰", basePrice: 50, volatility: 0.4 },
  GRASS: { name: "TouchGrass", emoji: "🌱", basePrice: 25, volatility: 0.15 },
  SONIC: { name: "SonicSpeed", emoji: "💨", basePrice: 200, volatility: 0.25 },
  MOON: { name: "ToTheMoon", emoji: "🌙", basePrice: 1000, volatility: 0.35 },
};

class PricesCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "This command can only be used in servers.";
    }

    if (!this.database) {
      this.success = false;
      return "Database is not available.";
    }

    const enabled = await this.database.isEconomyEnabled(this.guild.id);
    if (!enabled) {
      this.success = false;
      return "💰 The economy system is not enabled in this server.";
    }

    // Get all current prices
    const currentPrices = await this.database.getAllCryptoPrices(this.guild.id);

    // Build price display
    const priceLines = [];
    for (const [symbol, crypto] of Object.entries(CRYPTOS)) {
      const priceData = currentPrices.find((p) => p.crypto === symbol);
      const currentPrice = priceData?.price ?? crypto.basePrice;
      const change = priceData ? ((currentPrice - crypto.basePrice) / crypto.basePrice) * 100 : 0;
      const changeStr = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
      const changeEmoji = change > 5 ? "📈" : change < -5 ? "📉" : "➡️";

      priceLines.push(
        `${crypto.emoji} **$${symbol}** - ${crypto.name}\n` +
          `   Price: **${currentPrice.toFixed(2)}** 🪙 ${changeEmoji} ${changeStr}`,
      );
    }

    return {
      embeds: [
        {
          title: "📊 GabeCoin Crypto Market",
          description: priceLines.join("\n\n"),
          color: 0x9b59b6,
          footer: {
            text: "Use /crypto buy <symbol> <amount> to invest!",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  static description = "View current cryptocurrency prices";
  static aliases = ["market", "stonks"];
  static dbRequired = true;
}

export default PricesCommand;
