import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { parseFirstIntegerArg } from "#utils/commandArgs.js";

class TransferCommand extends Command {
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

        // Get target user
        const userOption = this.getOptionUser("user");
        let targetId = userOption?.id;
        if (!targetId && this.message?.mentions?.length > 0) {
            targetId = this.message.mentions[0].id;
        }

        if (!targetId) {
            this.success = false;
            return "❌ Please mention a user to transfer coins to.";
        }

        if (targetId === userId) {
            this.success = false;
            return "❌ You can't transfer coins to yourself!";
        }

        // Get amount
        let amount = this.getOptionInteger("amount");
        if (!amount && this.args?.length > 0) {
            amount = parseFirstIntegerArg(this.args);
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            this.success = false;
            return "❌ Please provide a valid amount to transfer.";
        }

        // Check balance
        const userData = await this.database.getEconomyUser(this.guild.id, userId);
        if (userData.balance < amount) {
            this.success = false;
            return `❌ Insufficient funds! You have **${userData.balance.toLocaleString()}** 🪙 but tried to send **${amount.toLocaleString()}** 🪙.`;
        }

        // Transfer
        const success = await this.database.transferBalance(this.guild.id, userId, targetId, amount);
        if (!success) {
            this.success = false;
            return "❌ Transfer failed. Please try again.";
        }

        // Log transactions
        await this.database.logTransaction(this.guild.id, userId, "transfer_out", -amount, undefined, `Sent to <@${targetId}>`);
        await this.database.logTransaction(this.guild.id, targetId, "transfer_in", amount, undefined, `Received from <@${userId}>`);

        const newBalance = userData.balance - amount;

        return {
            embeds: [
                {
                    title: "💸 Transfer Complete!",
                    description: `You sent **${amount.toLocaleString()}** 🪙 to <@${targetId}>!`,
                    color: 0x2ecc71,
                    fields: [
                        {
                            name: "Your New Balance",
                            value: `**${newBalance.toLocaleString()}** 🪙`,
                            inline: true,
                        },
                    ],
                },
            ],
        };
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "User to send coins to",
            required: true,
        },
        {
            name: "amount",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Amount of GabeCoins to send",
            required: true,
            minValue: 1,
        },
    ];

    static description = "Transfer GabeCoins to another user";
    static aliases = ["send", "pay", "give"];
    static dbRequired = true;
}

export default TransferCommand;
