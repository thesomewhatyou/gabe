import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class SlotsCommand extends Command {
    static symbols = [
        { emoji: "🍒", name: "cherry", multiplier: 2 },
        { emoji: "🍋", name: "lemon", multiplier: 2 },
        { emoji: "🍊", name: "orange", multiplier: 3 },
        { emoji: "🍇", name: "grape", multiplier: 4 },
        { emoji: "🔔", name: "bell", multiplier: 5 },
        { emoji: "⭐", name: "star", multiplier: 8 },
        { emoji: "💎", name: "diamond", multiplier: 15 },
        { emoji: "7️⃣", name: "seven", multiplier: 25 },
        { emoji: "🪙", name: "gabecoin", multiplier: 50 },
    ];

    // Weighted pool (more common symbols appear more often)
    static pool = [
        ...Array(20).fill(0), // cherry
        ...Array(18).fill(1), // lemon
        ...Array(15).fill(2), // orange
        ...Array(12).fill(3), // grape
        ...Array(10).fill(4), // bell
        ...Array(7).fill(5), // star
        ...Array(4).fill(6), // diamond
        ...Array(2).fill(7), // seven
        ...Array(1).fill(8), // gabecoin
    ];

    getRandomSymbol() {
        const index = SlotsCommand.pool[Math.floor(Math.random() * SlotsCommand.pool.length)];
        return SlotsCommand.symbols[index];
    }

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

        // Get bet amount
        let bet = this.options.bet ?? parseInt(this.args?.[0]);
        if (!bet || isNaN(bet) || bet < 10) {
            this.success = false;
            return "❌ Minimum bet is **10** 🪙!";
        }

        // Check balance
        const userData = await this.database.getEconomyUser(this.guild.id, userId);
        if (userData.balance < bet) {
            this.success = false;
            return `❌ Insufficient funds! You have **${userData.balance.toLocaleString()}** 🪙.`;
        }

        // Spin the slots
        const reel1 = this.getRandomSymbol();
        const reel2 = this.getRandomSymbol();
        const reel3 = this.getRandomSymbol();

        // Calculate winnings
        let winnings = 0;
        let resultText = "";
        let color = 0xe74c3c; // Red for loss

        // Three of a kind
        if (reel1.name === reel2.name && reel2.name === reel3.name) {
            winnings = bet * reel1.multiplier;
            resultText = `🎉 **JACKPOT!** Three ${reel1.emoji}s! (${reel1.multiplier}x)`;
            color = 0xffd700;
        }
        // Two of a kind
        else if (reel1.name === reel2.name || reel2.name === reel3.name || reel1.name === reel3.name) {
            const matchedSymbol = reel1.name === reel2.name ? reel1 : reel2.name === reel3.name ? reel2 : reel1;
            winnings = Math.floor(bet * (matchedSymbol.multiplier / 3));
            resultText = `✨ Two ${matchedSymbol.emoji}s! Partial win!`;
            color = 0x3498db;
        }
        // No match
        else {
            resultText = "💨 No match. Better luck next time!";
        }

        // Calculate net change
        const netChange = winnings - bet;
        const newBalance = userData.balance + netChange;

        // Update balance
        await this.database.setBalance(this.guild.id, userId, newBalance);
        await this.database.logTransaction(
            this.guild.id,
            userId,
            "slots",
            netChange,
            undefined,
            `Slots: ${reel1.emoji}${reel2.emoji}${reel3.emoji}`,
        );

        const slotDisplay = `
╔══════════════╗
║  ${reel1.emoji}  │  ${reel2.emoji}  │  ${reel3.emoji}  ║
╚══════════════╝`;

        return {
            embeds: [
                {
                    title: "🎰 Gabe's Slots",
                    description: `\`\`\`${slotDisplay}\`\`\`\n${resultText}`,
                    color,
                    fields: [
                        {
                            name: "Bet",
                            value: `${bet.toLocaleString()} 🪙`,
                            inline: true,
                        },
                        {
                            name: "Winnings",
                            value: `${winnings.toLocaleString()} 🪙`,
                            inline: true,
                        },
                        {
                            name: "Net",
                            value: `${netChange >= 0 ? "+" : ""}${netChange.toLocaleString()} 🪙`,
                            inline: true,
                        },
                        {
                            name: "New Balance",
                            value: `${newBalance.toLocaleString()} 🪙`,
                            inline: false,
                        },
                    ],
                },
            ],
        };
    }

    static flags = [
        {
            name: "bet",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Amount to bet (minimum 10)",
            required: true,
            minValue: 10,
        },
    ];

    static description = "Play the slot machine!";
    static aliases = ["slot"];
    static dbRequired = true;
}

export default SlotsCommand;
