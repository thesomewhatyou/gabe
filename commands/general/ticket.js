import Command from "#cmd-classes/command.js";

class TicketCommand extends Command {
    async run() {
        if (!this.guild) {
            this.success = false;
            return "❌ This command can only be used in a server!";
        }

        return `🎫 **Ticket System**

Use one of the following subcommands:
• \`ticket new [category]\` - Create a new support ticket
• \`ticket close [reason]\` - Close the current ticket
• \`ticket claim\` - Claim a ticket (staff only)
• \`ticket add @user\` - Add a user to the ticket
• \`ticket remove @user\` - Remove a user from the ticket
• \`ticket rename <name>\` - Rename the ticket channel

**Admin Commands:**
• \`ticket setup\` - Configure the ticket system
• \`ticket panel\` - Create a ticket panel`;
    }

    static description = "Support ticket system";
    static aliases = ["tickets", "support"];
    static dbRequired = true;
}

export default TicketCommand;
