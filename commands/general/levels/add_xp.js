import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class AddXPCommand extends Command {
    async run() {
        if (!this.guild) {
            this.success = false;
            return "This command can only be used in servers.";
        }

        if (!this.database) {
            this.success = false;
            return "Database is not available.";
        }

        // Check if user has administrator permission
        if (!this.member || !this.member.permissions.has("ADMINISTRATOR")) {
            this.success = false;
            return "❌ You need the **Administrator** permission to manage the leveling system.";
        }

        // Get parameters
        let userId = this.options.user;
        let amount = this.options.amount;

        // For classic commands, parse from args
        if (!userId && this.message) {
            if (this.message.mentions.length === 0) {
                this.success = false;
                return "❌ Please mention a user to add XP to.";
            }
            userId = this.message.mentions[0].id;
            amount = parseInt(this.args[0]);
        }

        if (!amount || isNaN(amount)) {
            this.success = false;
            return "❌ Please provide a valid amount of XP to add.";
        }

        if (amount <= 0) {
            this.success = false;
            return "❌ Amount must be greater than 0.";
        }

        // Add XP
        const result = await this.database.addXP(this.guild.id, userId, amount);

        let response = `✅ Added **${amount.toLocaleString()} XP** to <@${userId}>. They now have **${result.xp.toLocaleString()} XP** and are level **${result.level}**.`;

        if (result.leveledUp) {
            response += `\\n🎉 They leveled up to **level ${result.level}**!`;
        }

        return response;
    }

    static description = "Add XP to a user";
    static aliases = [];
    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to add XP to",
            required: true,
        },
        {
            name: "amount",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Amount of XP to add",
            required: true,
            minValue: 1,
        },
    ];
    static dbRequired = true;
}

export default AddXPCommand;
