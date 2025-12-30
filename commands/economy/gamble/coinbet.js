import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CoinbetCommand extends Command {
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

        // Get choice
        let choice = (this.options.choice ?? this.args?.[1])?.toLowerCase();
        if (!choice || !["heads", "tails", "h", "t"].includes(choice)) {
            this.success = false;
            return "❌ Please choose **heads** or **tails**!";
        }
        choice = choice === "h" ? "heads" : choice === "t" ? "tails" : choice;

        // Check balance
        const userData = await this.database.getEconomyUser(this.guild.id, userId);
        if (userData.balance < bet) {
            this.success = false;
            return `❌ Insufficient funds! You have **${userData.balance.toLocaleString()}** 🪙.`;
        }

        // Flip the coin (slight house edge: 49.5% win rate)
        const roll = Math.random() * 100;
        const result = roll < 49.5 ? (choice === "heads" ? "heads" : "tails") : choice === "heads" ? "tails" : "heads";
        const won = result === choice;

        // 0.5% chance of edge (lose either way but special message)
        const isEdge = roll >= 99.5;

        let winnings = 0;
        let netChange = 0;
        let resultEmoji = "";
        let resultText = "";
        let color = 0xe74c3c;

        if (isEdge) {
            resultEmoji = "🔘";
            resultText = "**IT LANDED ON ITS EDGE!** The house takes all. Reality is broken.";
            netChange = -bet;
            color = 0x9b59b6;
        } else if (won) {
            winnings = bet * 2;
            netChange = bet;
            resultEmoji = choice === "heads" ? "🪙" : "👻";
            resultText = `It's **${result.toUpperCase()}**! You win!`;
            color = 0x2ecc71;
        } else {
            netChange = -bet;
            resultEmoji = result === "heads" ? "🪙" : "👻";
            resultText = `It's **${result.toUpperCase()}**! You lose!`;
        }

        const newBalance = userData.balance + netChange;
        await this.database.setBalance(this.guild.id, userId, newBalance);
        await this.database.logTransaction(
            this.guild.id,
            userId,
            "coinbet",
            netChange,
            undefined,
            `Coinbet: chose ${choice}, got ${isEdge ? "edge" : result}`,
        );

        return {
            embeds: [
                {
                    title: "🪙 Coin Flip Bet",
                    description: `You bet on **${choice.toUpperCase()}**...\n\n${resultEmoji} ${resultText}`,
                    color,
                    fields: [
                        {
                            name: "Bet",
                            value: `${bet.toLocaleString()} 🪙`,
                            inline: true,
                        },
                        {
                            name: "Result",
                            value: `${netChange >= 0 ? "+" : ""}${netChange.toLocaleString()} 🪙`,
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
            name: "bet",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Amount to bet (minimum 10)",
            required: true,
            minValue: 10,
        },
        {
            name: "choice",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Heads or Tails",
            required: true,
            choices: [
                { name: "Heads", value: "heads" },
                { name: "Tails", value: "tails" },
            ],
        },
    ];

    static description = "Bet on a coin flip";
    static aliases = ["flip", "cf"];
    static dbRequired = true;
}

export default CoinbetCommand;
