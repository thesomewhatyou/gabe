import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class RouletteCommand extends Command {
  static numbers = {
    red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
    green: [0],
  };

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

    // Get bet type
    let betType = (this.options.type ?? this.args?.[1])?.toLowerCase();
    const validBets = ["red", "black", "green", "odd", "even", "high", "low"];
    const numBet = parseInt(betType);
    const isNumberBet = !isNaN(numBet) && numBet >= 0 && numBet <= 36;

    if (!betType || (!validBets.includes(betType) && !isNumberBet)) {
      this.success = false;
      return "❌ Valid bets: **red**, **black**, **green**, **odd**, **even**, **high** (19-36), **low** (1-18), or a **number** (0-36)";
    }

    // Check balance
    const userData = await this.database.getEconomyUser(this.guild.id, userId);
    if (userData.balance < bet) {
      this.success = false;
      return `❌ Insufficient funds! You have **${userData.balance.toLocaleString()}** 🪙.`;
    }

    // Spin the wheel
    const result = Math.floor(Math.random() * 37); // 0-36
    const isRed = RouletteCommand.numbers.red.includes(result);
    const isBlack = RouletteCommand.numbers.black.includes(result);
    const isGreen = result === 0;
    const resultColor = isGreen ? "🟢" : isRed ? "🔴" : "⚫";

    // Check win conditions
    let won = false;
    let multiplier = 0;

    if (isNumberBet) {
      won = result === numBet;
      multiplier = 36; // 35:1 payout + original bet
    } else {
      switch (betType) {
        case "red":
          won = isRed;
          multiplier = 2;
          break;
        case "black":
          won = isBlack;
          multiplier = 2;
          break;
        case "green":
          won = isGreen;
          multiplier = 14; // Better odds than real roulette
          break;
        case "odd":
          won = result !== 0 && result % 2 === 1;
          multiplier = 2;
          break;
        case "even":
          won = result !== 0 && result % 2 === 0;
          multiplier = 2;
          break;
        case "high":
          won = result >= 19 && result <= 36;
          multiplier = 2;
          break;
        case "low":
          won = result >= 1 && result <= 18;
          multiplier = 2;
          break;
      }
    }

    const winnings = won ? bet * multiplier : 0;
    const netChange = winnings - bet;
    const newBalance = userData.balance + netChange;

    await this.database.setBalance(this.guild.id, userId, newBalance);
    await this.database.logTransaction(
      this.guild.id,
      userId,
      "roulette",
      netChange,
      undefined,
      `Roulette: bet ${betType}, landed ${result}`,
    );

    const resultText = won
      ? `🎉 **YOU WIN!** The ball landed on ${resultColor} **${result}**!`
      : `The ball landed on ${resultColor} **${result}**. Better luck next time!`;

    return {
      embeds: [
        {
          title: "🎡 Gabe's Roulette",
          description: `You bet on **${isNumberBet ? numBet : betType.toUpperCase()}**...\n\n${resultText}`,
          color: won ? 0x2ecc71 : 0xe74c3c,
          fields: [
            {
              name: "Bet",
              value: `${bet.toLocaleString()} 🪙`,
              inline: true,
            },
            {
              name: "Multiplier",
              value: won ? `${multiplier}x` : "0x",
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
    {
      name: "type",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "What to bet on (red, black, green, odd, even, high, low, or 0-36)",
      required: true,
    },
  ];

  static description = "Spin the roulette wheel!";
  static aliases = ["wheel"];
  static dbRequired = true;
}

export default RouletteCommand;
