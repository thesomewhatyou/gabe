import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class GrantCommand extends Command {
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
            return "🔒 You can't print money without authorization.";
        }

        // Get target user
        const userOption = this.getOptionUser("user");
        let targetId = userOption?.id;
        if (!targetId && this.message?.mentions?.length > 0) {
            targetId = this.message.mentions[0].id;
        }

        if (!targetId) {
            this.success = false;
            return "❌ Please mention a user to grant coins to.";
        }

        // Get amount
        let amount = this.getOptionInteger("amount") ?? parseInt(this.args?.[0]);
        if (!amount || isNaN(amount)) {
            this.success = false;
            return "❌ Please provide a valid amount.";
        }

        // Grant (or take if negative)
        const newBalance = await this.database.addBalance(this.guild.id, targetId, amount);

        await this.database.logTransaction(
            this.guild.id,
            targetId,
            "admin_grant",
            amount,
            undefined,
            `${amount >= 0 ? "Granted" : "Taken"} by <@${this.author.id}>`,
        );

        const action = amount >= 0 ? "granted" : "taken from";
        const emoji = amount >= 0 ? "💵" : "💸";

        return {
            embeds: [
                {
                    title: `${emoji} Money ${amount >= 0 ? "Printer Go Brrr" : "Confiscated"}`,
                    description: `**${Math.abs(amount).toLocaleString()}** 🪙 ${action} <@${targetId}>!`,
                    color: amount >= 0 ? 0x2ecc71 : 0xe74c3c,
                    fields: [
                        {
                            name: "Their New Balance",
                            value: `${newBalance.toLocaleString()} 🪙`,
                            inline: true,
                        },
                        {
                            name: "Authorized By",
                            value: `<@${this.author.id}>`,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: amount >= 0 ? "The Fed has spoken." : "Taxation is... well, you know.",
                    },
                },
            ],
        };
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "User to grant/take coins to/from",
            required: true,
        },
        {
            name: "amount",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Amount to grant (positive) or take (negative)",
            required: true,
        },
    ];

    static description = "Grant or take coins from a user";
    static aliases = ["give", "take", "print"];
    static adminOnly = true;
    static dbRequired = true;
}

export default GrantCommand;
