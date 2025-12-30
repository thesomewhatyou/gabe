import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class InflateCommand extends Command {
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
            return "🔒 Nice try, but you're not authorized for market manipulation.";
        }

        // Get percentage
        let percentage = this.options.percentage ?? parseFloat(this.args?.[0]);
        if (!percentage || isNaN(percentage)) {
            this.success = false;
            return "❌ Please provide a percentage (e.g., 50 for 50% increase, -30 for 30% decrease).";
        }

        // Apply inflation
        const affectedUsers = await this.database.inflateAllBalances(this.guild.id, percentage);

        const direction = percentage > 0 ? "inflated" : "deflated";
        const emoji = percentage > 0 ? "📈" : "📉";
        const absPercentage = Math.abs(percentage);

        await this.database.logTransaction(
            this.guild.id,
            this.author.id,
            "admin_inflation",
            percentage,
            undefined,
            `${direction} all balances by ${absPercentage}%`,
        );

        return {
            embeds: [
                {
                    title: `${emoji} Market ${percentage > 0 ? "Inflation" : "Deflation"}!`,
                    description: `All balances have been ${direction} by **${absPercentage}%**!`,
                    color: percentage > 0 ? 0xe74c3c : 0x3498db,
                    fields: [
                        {
                            name: "Users Affected",
                            value: `${affectedUsers}`,
                            inline: true,
                        },
                        {
                            name: "Executed By",
                            value: `<@${this.author.id}>`,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "The invisible hand of the market has struck...",
                    },
                },
            ],
        };
    }

    static flags = [
        {
            name: "percentage",
            type: Constants.ApplicationCommandOptionTypes.NUMBER,
            description: "Percentage to inflate/deflate (positive = inflate, negative = deflate)",
            required: true,
        },
    ];

    static description = "Inflate or deflate all user balances";
    static aliases = ["hyperinflation", "deflate"];
    static adminOnly = true;
    static dbRequired = true;
}

export default InflateCommand;
