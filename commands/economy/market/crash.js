import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";
import { CRYPTOS } from "../crypto/prices.js";

class CrashCommand extends Command {
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
            return "🔒 You don't have the power to crash markets.";
        }

        // Get symbol
        let symbol = (this.options.symbol ?? this.args?.[0])?.toUpperCase();
        if (!symbol || !CRYPTOS[symbol]) {
            const validSymbols = Object.keys(CRYPTOS).join(", ");
            this.success = false;
            return `❌ Invalid crypto symbol. Valid options: ${validSymbols}`;
        }

        // Get crash percentage (default: random between 50-90%)
        let crashPercent = this.options.percentage ?? parseFloat(this.args?.[1]);
        if (!crashPercent || isNaN(crashPercent)) {
            crashPercent = 50 + Math.random() * 40; // 50-90%
        }
        crashPercent = Math.min(Math.max(crashPercent, 10), 99); // Clamp between 10-99%

        // Get current price and crash it
        const currentPrice = await this.database.getCryptoPrice(this.guild.id, symbol);
        const newPrice = currentPrice * (1 - crashPercent / 100);

        // Record old price in history
        await this.database.recordCryptoPrice(this.guild.id, symbol, currentPrice);

        // Set new crashed price
        await this.database.setCryptoPrice(this.guild.id, symbol, newPrice);

        await this.database.logTransaction(
            this.guild.id,
            this.author.id,
            "admin_crash",
            -crashPercent,
            symbol,
            `Crashed ${symbol} by ${crashPercent.toFixed(1)}%`,
        );

        const crypto = CRYPTOS[symbol];

        return {
            embeds: [
                {
                    title: `💥 ${crypto.emoji} $${symbol} CRASH!`,
                    description: `**${crypto.name}** has crashed by **${crashPercent.toFixed(1)}%**!`,
                    color: 0xe74c3c,
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
                            name: "Crash",
                            value: `📉 -${crashPercent.toFixed(1)}%`,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "Holders are in shambles...",
                    },
                },
            ],
        };
    }

    static flags = [
        {
            name: "symbol",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Crypto to crash",
            required: true,
            choices: Object.keys(CRYPTOS).map((s) => ({ name: `$${s}`, value: s })),
        },
        {
            name: "percentage",
            type: Constants.ApplicationCommandOptionTypes.NUMBER,
            description: "Crash percentage (10-99, default: random 50-90%)",
            required: false,
        },
    ];

    static description = "Crash a cryptocurrency!";
    static aliases = ["tank", "dump"];
    static adminOnly = true;
    static dbRequired = true;
}

export default CrashCommand;
