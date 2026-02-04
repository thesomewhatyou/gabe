import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";
import { CRYPTOS } from "../crypto/prices.js";

class RugCommand extends Command {
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
      return "🔒 You don't have the power to rug pull.";
    }

    const symbol = (this.options.symbol ?? this.args?.[0])?.toUpperCase();

    if (symbol === "ALL" || !symbol) {
      // RUG PULL EVERYTHING
      await this.database.wipeCrypto(this.guild.id);

      // Reset all prices to 0.01
      for (const sym of Object.keys(CRYPTOS)) {
        await this.database.setCryptoPrice(this.guild.id, sym, 0.01);
      }

      await this.database.logTransaction(
        this.guild.id,
        this.author.id,
        "admin_rug_all",
        0,
        undefined,
        "Complete rug pull - all crypto wiped",
      );

      return {
        embeds: [
          {
            title: "🔥💀 COMPLETE RUG PULL 💀🔥",
            description:
              "**ALL CRYPTOCURRENCIES** have been **RUG PULLED**!\n\n" +
              "Everyone's crypto holdings are now **WORTHLESS**.\n" +
              "All prices reset to **0.01** 🪙.",
            color: 0x000000,
            fields: [
              {
                name: "Executed By",
                value: `<@${this.author.id}>`,
                inline: true,
              },
              {
                name: "Survivors",
                value: "None.",
                inline: true,
              },
            ],
            footer: {
              text: "Thank you for playing GabeCoin™. Your funds are now our funds.",
            },
          },
        ],
      };
    }

    // Rug specific crypto
    if (!CRYPTOS[symbol]) {
      const validSymbols = Object.keys(CRYPTOS).join(", ");
      this.success = false;
      return `❌ Invalid crypto symbol. Valid options: ${validSymbols}, or ALL`;
    }

    // Wipe this specific crypto
    await this.database.wipeCrypto(this.guild.id, symbol);
    await this.database.setCryptoPrice(this.guild.id, symbol, 0.01);

    await this.database.logTransaction(this.guild.id, this.author.id, "admin_rug", 0, symbol, `Rug pulled ${symbol}`);

    const crypto = CRYPTOS[symbol];

    return {
      embeds: [
        {
          title: `🔥 ${crypto.emoji} $${symbol} RUG PULL!`,
          description:
            `**${crypto.name}** has been **RUG PULLED**!\n\n` +
            `All holdings of $${symbol} are now **GONE**.\n` +
            `Price reset to **0.01** 🪙.`,
          color: 0x000000,
          fields: [
            {
              name: "Executed By",
              value: `<@${this.author.id}>`,
              inline: true,
            },
          ],
          footer: {
            text: "Devs do a little trolling...",
          },
        },
      ],
    };
  }

  static flags = [
    {
      name: "symbol",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Crypto to rug (or 'ALL' for complete devastation)",
      required: false,
    },
  ];

  static description = "🔥 RUG PULL - wipe all crypto holdings!";
  static aliases = ["rugpull"];
  static adminOnly = true;
  static dbRequired = true;
}

export default RugCommand;
