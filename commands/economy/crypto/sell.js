import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { CRYPTOS } from "./prices.js";

class SellCommand extends Command {
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

    const userId = this.author?.id;
    if (!userId) {
      this.success = false;
      return "Could not identify user.";
    }

    // Get symbol
    let symbol = (this.options.symbol ?? this.args?.[0])?.toUpperCase();
    if (!symbol || !CRYPTOS[symbol]) {
      const validSymbols = Object.keys(CRYPTOS).join(", ");
      this.success = false;
      return `❌ Invalid crypto symbol. Valid options: ${validSymbols}`;
    }

    // Get current holding
    const holding = await this.database.getCryptoHolding(this.guild.id, userId, symbol);
    if (!holding || holding.amount <= 0) {
      this.success = false;
      return `❌ You don't own any **$${symbol}**!`;
    }

    // Get amount (or 'all')
    let amount;
    const amountInput = this.options.amount ?? this.args?.[1];
    if (amountInput === "all" || amountInput === undefined) {
      amount = holding.amount;
    } else {
      amount = parseFloat(amountInput);
      if (isNaN(amount) || amount <= 0) {
        this.success = false;
        return "❌ Please provide a valid amount to sell.";
      }
      if (amount > holding.amount) {
        this.success = false;
        return `❌ You only have **${holding.amount.toFixed(4)} $${symbol}**!`;
      }
    }

    // Get current price
    const price = await this.database.getCryptoPrice(this.guild.id, symbol);
    const totalValue = Math.floor(amount * price);

    // Execute sale
    await this.database.addCryptoHolding(this.guild.id, userId, symbol, -amount);
    const newBalance = await this.database.addBalance(this.guild.id, userId, totalValue);
    await this.database.logTransaction(
      this.guild.id,
      userId,
      "crypto_sell",
      totalValue,
      symbol,
      `Sold ${amount} ${symbol} at ${price.toFixed(2)} each`,
    );

    const crypto = CRYPTOS[symbol];
    const remainingHolding = holding.amount - amount;

    return {
      embeds: [
        {
          title: `${crypto.emoji} Crypto Sale Complete!`,
          description: `You sold **${amount.toFixed(4)} $${symbol}** for **${totalValue.toLocaleString()}** 🪙!`,
          color: 0xe74c3c,
          fields: [
            {
              name: "Price Per Coin",
              value: `${price.toFixed(2)} 🪙`,
              inline: true,
            },
            {
              name: "Remaining Holdings",
              value: `${remainingHolding.toFixed(4)} $${symbol}`,
              inline: true,
            },
            {
              name: "New Balance",
              value: `${newBalance.toLocaleString()} 🪙`,
              inline: true,
            },
          ],
        },
      ],
    };
  }

  static flags = [
    {
      name: "symbol",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Crypto symbol to sell (GABE, DEGEN, GRASS, SONIC, MOON)",
      required: true,
      choices: Object.keys(CRYPTOS).map((s) => ({ name: `$${s}`, value: s })),
    },
    {
      name: "amount",
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      description: "Amount to sell (leave empty to sell all)",
      required: false,
      minValue: 0.0001,
    },
  ];

  static description = "Sell cryptocurrency for GabeCoins";
  static aliases = [];
  static dbRequired = true;
}

export default SellCommand;
