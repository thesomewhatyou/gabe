import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";
import { CRYPTOS } from "../crypto/prices.js";

class SetpriceCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "This command can only be used in servers.";
    }

    if (!this.database) {
      this.success = false;
      return "Database is not available.";
    }

    // Check if user is bot owner or server admin
    const isBotOwner = isOwner(this.author?.id);
    const isServerAdmin = this.member?.permissions?.has("ADMINISTRATOR");

    if (!isBotOwner && !isServerAdmin) {
      this.success = false;
      return "🔒 You can't manipulate prices directly.";
    }

    // Get symbol
    let symbol = (this.options.symbol ?? this.args?.[0])?.toUpperCase();
    if (!symbol || !CRYPTOS[symbol]) {
      const validSymbols = Object.keys(CRYPTOS).join(", ");
      this.success = false;
      return `❌ Invalid crypto symbol. Valid options: ${validSymbols}`;
    }

    // Get new price
    let newPrice = this.options.price ?? parseFloat(this.args?.[1]);
    if (!newPrice || isNaN(newPrice) || newPrice < 0.01) {
      this.success = false;
      return "❌ Please provide a valid price (minimum 0.01).";
    }

    // Get current price for comparison
    const currentPrice = await this.database.getCryptoPrice(this.guild.id, symbol);

    // Record old price in history
    await this.database.recordCryptoPrice(this.guild.id, symbol, currentPrice);

    // Set new price
    await this.database.setCryptoPrice(this.guild.id, symbol, newPrice);

    await this.database.logTransaction(
      this.guild.id,
      this.author.id,
      "admin_setprice",
      newPrice - currentPrice,
      symbol,
      `Set ${symbol} price to ${newPrice}`,
    );

    const crypto = CRYPTOS[symbol];
    const change = ((newPrice - currentPrice) / currentPrice) * 100;
    const changeEmoji = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";

    return {
      embeds: [
        {
          title: `${crypto.emoji} Price Manipulation`,
          description: `**$${symbol}** price has been manually set.`,
          color: 0x9b59b6,
          fields: [
            {
              name: "Previous Price",
              value: `${currentPrice.toFixed(2)} 🪙`,
              inline: true,
            },
            {
              name: "New Price",
              value: `**${newPrice.toFixed(2)}** 🪙`,
              inline: true,
            },
            {
              name: "Change",
              value: `${changeEmoji} ${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
              inline: true,
            },
          ],
          footer: {
            text: "Market manipulation is totally legal here.",
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "symbol",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Crypto to set price for",
      required: true,
      choices: Object.keys(CRYPTOS).map((s) => ({ name: `$${s}`, value: s })),
    },
    {
      name: "price",
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      description: "New price in GabeCoins",
      required: true,
      minValue: 0.01,
    },
  ];

  static description = "Manually set a cryptocurrency price";
  static aliases = ["set"];
  static adminOnly = true;
  static dbRequired = true;
}

export default SetpriceCommand;
