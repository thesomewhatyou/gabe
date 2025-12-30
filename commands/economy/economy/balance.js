import Command from "#cmd-classes/command.js";

class BalanceCommand extends Command {
    async run() {
        if (!this.guild) {
            this.success = false;
            return "This command can only be used in servers.";
        }

        if (!this.database) {
            this.success = false;
            return "Database is not available.";
        }

        // Check if economy is enabled
        const enabled = await this.database.isEconomyEnabled(this.guild.id);
        if (!enabled) {
            this.success = false;
            return "💰 The economy system is not enabled in this server. Ask an admin to enable it!";
        }

        // Get target user (mentioned or self)
        let targetId = this.options.user ?? this.author?.id;
        if (!targetId && this.message?.mentions?.length > 0) {
            targetId = this.message.mentions[0].id;
        }
        if (!targetId) {
            targetId = this.author?.id;
        }

        const userData = await this.database.getEconomyUser(this.guild.id, targetId);
        const holdings = await this.database.getCryptoHoldings(this.guild.id, targetId);
        const prices = await this.database.getAllCryptoPrices(this.guild.id);

        // Calculate total crypto value
        let cryptoValue = 0;
        const holdingsList = [];
        for (const holding of holdings) {
            const priceData = prices.find((p) => p.crypto === holding.crypto);
            const price = priceData?.price ?? 100;
            const value = holding.amount * price;
            cryptoValue += value;
            holdingsList.push({
                crypto: holding.crypto,
                amount: holding.amount,
                value,
                price,
            });
        }

        const isSelf = targetId === this.author?.id;
        const userMention = isSelf ? "Your" : `<@${targetId}>'s`;

        // Build holdings display
        let holdingsDisplay = "*No crypto holdings*";
        if (holdingsList.length > 0) {
            holdingsDisplay = holdingsList
                .map((h) => `**$${h.crypto}**: ${h.amount.toFixed(4)} (≈ ${Math.floor(h.value).toLocaleString()} 🪙)`)
                .join("\n");
        }

        return {
            embeds: [
                {
                    title: `💰 ${userMention} Wallet`,
                    color: 0xffd700,
                    fields: [
                        {
                            name: "🪙 GabeCoins",
                            value: `**${userData.balance.toLocaleString()}**`,
                            inline: true,
                        },
                        {
                            name: "📈 Crypto Value",
                            value: `**${Math.floor(cryptoValue).toLocaleString()}** 🪙`,
                            inline: true,
                        },
                        {
                            name: "💎 Net Worth",
                            value: `**${(userData.balance + Math.floor(cryptoValue)).toLocaleString()}** 🪙`,
                            inline: true,
                        },
                        {
                            name: "📊 Holdings",
                            value: holdingsDisplay,
                            inline: false,
                        },
                    ],
                    footer: {
                        text: "Use /economy daily for free coins!",
                    },
                },
            ],
        };
    }

    static flags = [
        {
            name: "user",
            type: 6, // USER
            description: "User to check balance of",
            required: false,
        },
    ];

    static description = "Check your or someone's GabeCoin balance and holdings";
    static aliases = ["bal", "wallet", "coins"];
    static dbRequired = true;
}

export default BalanceCommand;
