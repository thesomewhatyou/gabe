import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";
import { CRYPTOS } from "../crypto/prices.js";

class BlackswanCommand extends Command {
    static events = [
        {
            name: "Hyperinflation",
            emoji: "💵",
            description: "The money printer went brrr too hard...",
            execute: async (db, guildId) => {
                const percent = 100 + Math.random() * 400; // 100-500% inflation
                const affected = await db.inflateAllBalances(guildId, percent);
                return {
                    message: `All balances **inflated by ${percent.toFixed(0)}%**! Money is worthless now!`,
                    affected,
                    severity: "extreme",
                };
            },
        },
        {
            name: "Market Crash",
            emoji: "📉",
            description: "Everything is crashing!",
            execute: async (db, guildId) => {
                const cryptos = Object.keys(CRYPTOS);
                for (const symbol of cryptos) {
                    const currentPrice = await db.getCryptoPrice(guildId, symbol);
                    const crashPercent = 40 + Math.random() * 50; // 40-90% crash
                    await db.recordCryptoPrice(guildId, symbol, currentPrice);
                    await db.setCryptoPrice(guildId, symbol, currentPrice * (1 - crashPercent / 100));
                }
                return {
                    message: "**All cryptocurrencies crashed by 40-90%!** The market is in shambles!",
                    affected: cryptos.length,
                    severity: "extreme",
                };
            },
        },
        {
            name: "Bull Run",
            emoji: "🐂",
            description: "To the moon!",
            execute: async (db, guildId) => {
                const cryptos = Object.keys(CRYPTOS);
                for (const symbol of cryptos) {
                    const currentPrice = await db.getCryptoPrice(guildId, symbol);
                    const pumpPercent = 50 + Math.random() * 200; // 50-250% pump
                    await db.recordCryptoPrice(guildId, symbol, currentPrice);
                    await db.setCryptoPrice(guildId, symbol, currentPrice * (1 + pumpPercent / 100));
                }
                return {
                    message: "**BULL RUN!** All cryptocurrencies pumped 50-250%! 🚀",
                    affected: cryptos.length,
                    severity: "positive",
                };
            },
        },
        {
            name: "Whale Alert",
            emoji: "🐋",
            description: "A mysterious whale enters the market...",
            execute: async (db, guildId) => {
                // Pick a random crypto and drastically change its price
                const cryptos = Object.keys(CRYPTOS);
                const symbol = cryptos[Math.floor(Math.random() * cryptos.length)];
                const currentPrice = await db.getCryptoPrice(guildId, symbol);
                const isPump = Math.random() > 0.5;
                const percent = 200 + Math.random() * 500; // 200-700%
                const newPrice = isPump ? currentPrice * (1 + percent / 100) : currentPrice * (1 - percent / 200);
                await db.recordCryptoPrice(guildId, symbol, currentPrice);
                await db.setCryptoPrice(guildId, symbol, Math.max(0.01, newPrice));
                return {
                    message: `A **whale** just ${isPump ? "PUMPED" : "DUMPED"} **$${symbol}** by **${percent.toFixed(0)}%**!`,
                    affected: 1,
                    severity: isPump ? "positive" : "negative",
                };
            },
        },
        {
            name: "Taxation Event",
            emoji: "🏛️",
            description: "The IRS has entered the chat...",
            execute: async (db, guildId) => {
                const taxRate = 10 + Math.random() * 30; // 10-40% tax
                const affected = await db.inflateAllBalances(guildId, -taxRate);
                return {
                    message: `**TAXATION EVENT!** The government took **${taxRate.toFixed(0)}%** of everyone's balance!`,
                    affected,
                    severity: "negative",
                };
            },
        },
        {
            name: "Airdrop",
            emoji: "🎁",
            description: "Free money!",
            execute: async (db, guildId) => {
                const percent = 20 + Math.random() * 80; // 20-100% bonus
                const affected = await db.inflateAllBalances(guildId, percent);
                return {
                    message: `**AIRDROP!** Everyone received a **${percent.toFixed(0)}%** bonus to their balance!`,
                    affected,
                    severity: "positive",
                };
            },
        },
    ];

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
            return "🔒 You can't trigger black swan events.";
        }

        // Pick a random event
        const event = BlackswanCommand.events[Math.floor(Math.random() * BlackswanCommand.events.length)];

        // Execute it
        const result = await event.execute(this.database, this.guild.id);

        await this.database.logTransaction(
            this.guild.id,
            this.author.id,
            "admin_blackswan",
            0,
            undefined,
            `Black Swan: ${event.name}`,
        );

        const colors = {
            extreme: 0x9b59b6,
            positive: 0x2ecc71,
            negative: 0xe74c3c,
        };

        return {
            embeds: [
                {
                    title: `${event.emoji} BLACK SWAN EVENT: ${event.name.toUpperCase()}!`,
                    description: `${event.description}\n\n${result.message}`,
                    color: colors[result.severity] ?? 0x3498db,
                    fields: [
                        {
                            name: "Affected",
                            value: `${result.affected}`,
                            inline: true,
                        },
                        {
                            name: "Triggered By",
                            value: `<@${this.author.id}>`,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "Nobody saw this coming...",
                    },
                    timestamp: new Date().toISOString(),
                },
            ],
        };
    }

    static description = "Trigger a random market chaos event!";
    static aliases = ["chaos", "event"];
    static adminOnly = true;
    static dbRequired = true;
}

export default BlackswanCommand;
