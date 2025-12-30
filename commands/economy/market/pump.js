import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";
import { CRYPTOS } from "../crypto/prices.js";

class PumpCommand extends Command {
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
            return "🔒 You don't have the power to pump markets.";
        }

        // Get symbol
        let symbol = (this.options.symbol ?? this.args?.[0])?.toUpperCase();
        if (!symbol || !CRYPTOS[symbol]) {
            const validSymbols = Object.keys(CRYPTOS).join(", ");
            this.success = false;
            return `❌ Invalid crypto symbol. Valid options: ${validSymbols}`;
        }

        // Get pump percentage (default: random between 50-200%)
        let pumpPercent = this.options.percentage ?? parseFloat(this.args?.[1]);
        if (!pumpPercent || isNaN(pumpPercent)) {
            pumpPercent = 50 + Math.random() * 150; // 50-200%
        }
        pumpPercent = Math.max(pumpPercent, 10); // Minimum 10%

        // Get current price and pump it
        const currentPrice = await this.database.getCryptoPrice(this.guild.id, symbol);
        const newPrice = currentPrice * (1 + pumpPercent / 100);

        // Record old price in history
        await this.database.recordCryptoPrice(this.guild.id, symbol, currentPrice);

        // Set new pumped price
        await this.database.setCryptoPrice(this.guild.id, symbol, newPrice);

        await this.database.logTransaction(
            this.guild.id,
            this.author.id,
            "admin_pump",
            pumpPercent,
            symbol,
            `Pumped ${symbol} by ${pumpPercent.toFixed(1)}%`,
        );

        const crypto = CRYPTOS[symbol];

        return {
            embeds: [
                {
                    title: `🚀 ${crypto.emoji} $${symbol} TO THE MOON!`,
                    description: `**${crypto.name}** has pumped by **${pumpPercent.toFixed(1)}%**!`,
                    color: 0x2ecc71,
                    fields: [
                        {
                            name: "Previous Price",
                            value: `~~${currentPrice.toFixed(2)}~~ 🪙`,
                            inline: true,
                        },
                        {
                            name: "New Price",
                            value: `**${newPrice.toFixed(2)}** 🪙`,
                            inline: true,
                        },
                        {
                            name: "Pump",
                            value: `📈 +${pumpPercent.toFixed(1)}%`,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "Diamond hands rejoice! 💎🙌",
                    },
                },
            ],
        };
    }

    static flags = [
        {
            name: "symbol",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Crypto to pump",
            required: true,
            choices: Object.keys(CRYPTOS).map((s) => ({ name: `$${s}`, value: s })),
        },
        {
            name: "percentage",
            type: Constants.ApplicationCommandOptionTypes.NUMBER,
            description: "Pump percentage (minimum 10%, default: random 50-200%)",
            required: false,
        },
    ];

    static description = "Pump a cryptocurrency!";
    static aliases = ["moon"];
    static adminOnly = true;
    static dbRequired = true;
}

export default PumpCommand;
