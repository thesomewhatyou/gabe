import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { CRYPTOS } from "./prices.js";

class BuyCommand extends Command {
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

    // Get amount
    let amount = this.options.amount ?? parseFloat(this.args?.[1]);
    if (!amount || isNaN(amount) || amount <= 0) {
      this.success = false;
      return "❌ Please provide a valid amount to buy.";
    }

    // Get current price
    const price = await this.database.getCryptoPrice(this.guild.id, symbol);
    const totalCost = Math.ceil(amount * price);

    // Check balance
    const userData = await this.database.getEconomyUser(this.guild.id, userId);
    if (userData.balance < totalCost) {
      this.success = false;
      return `❌ Insufficient funds! You need **${totalCost.toLocaleString()}** 🪙 but only have **${userData.balance.toLocaleString()}** 🪙.`;
    }

    // Execute purchase
    await this.database.addBalance(this.guild.id, userId, -totalCost);
    const newHolding = await this.database.addCryptoHolding(this.guild.id, userId, symbol, amount);
    await this.database.logTransaction(
      this.guild.id,
      userId,
      "crypto_buy",
      -totalCost,
      symbol,
      `Bought ${amount} ${symbol} at ${price.toFixed(2)} each`,
    );

    const crypto = CRYPTOS[symbol];

    return {
      embeds: [
        {
          title: `${crypto.emoji} Crypto Purchase Complete!`,
          description: `You bought **${amount.toFixed(4)} $${symbol}** for **${totalCost.toLocaleString()}** 🪙!`,
          color: 0x2ecc71,
          fields: [
            {
              name: "Price Per Coin",
              value: `${price.toFixed(2)} 🪙`,
              inline: true,
            },
            {
              name: "Your Holdings",
              value: `${newHolding.toFixed(4)} $${symbol}`,
              inline: true,
            },
            {
              name: "Remaining Balance",
              value: `${(userData.balance - totalCost).toLocaleString()} 🪙`,
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
      description: "Crypto symbol to buy (GABE, DEGEN, GRASS, SONIC, MOON)",
      required: true,
      choices: Object.keys(CRYPTOS).map((s) => ({ name: `$${s}`, value: s })),
    },
    {
      name: "amount",
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      description: "Amount of crypto to buy",
      required: true,
      minValue: 0.0001,
    },
  ];

  static description = "Buy cryptocurrency with GabeCoins";
  static aliases = ["purchase"];
  static dbRequired = true;
}

export default BuyCommand;
