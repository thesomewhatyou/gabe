import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class WipeCommand extends Command {
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
            return "🔒 You don't have access to the reset button.";
        }

        // Get target user
        let targetId = this.options.user;
        if (!targetId && this.message?.mentions?.length > 0) {
            targetId = this.message.mentions[0].id;
        }

        if (!targetId) {
            this.success = false;
            return "❌ Please mention a user to wipe.";
        }

        // Get their current data before wipe
        const userData = await this.database.getEconomyUser(this.guild.id, targetId);
        const holdings = await this.database.getCryptoHoldings(this.guild.id, targetId);

        // Wipe everything
        await this.database.wipeUserEconomy(this.guild.id, targetId);

        await this.database.logTransaction(
            this.guild.id,
            targetId,
            "admin_wipe",
            -userData.balance,
            undefined,
            `Account wiped by <@${this.author.id}>`,
        );

        const holdingsText =
            holdings.length > 0
                ? holdings.map((h) => `• ${h.amount.toFixed(4)} $${h.crypto}`).join("\n")
                : "No crypto holdings";

        return {
            embeds: [
                {
                    title: "🗑️ Account Wiped!",
                    description: `<@${targetId}>'s economy data has been **completely erased**.`,
                    color: 0x95a5a6,
                    fields: [
                        {
                            name: "Balance Lost",
                            value: `${userData.balance.toLocaleString()} 🪙`,
                            inline: true,
                        },
                        {
                            name: "Crypto Lost",
                            value: holdingsText,
                            inline: true,
                        },
                        {
                            name: "Wiped By",
                            value: `<@${this.author.id}>`,
                            inline: false,
                        },
                    ],
                    footer: {
                        text: "Gone. Reduced to atoms.",
                    },
                },
            ],
        };
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "User to wipe",
            required: true,
        },
    ];

    static description = "Wipe a user's entire economy data";
    static aliases = ["reset", "nuke"];
    static adminOnly = true;
    static dbRequired = true;
}

export default WipeCommand;
