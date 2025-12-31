import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class ClaimTicketCommand extends Command {
    async run() {
        this.success = false;

        if (!this.guild) return "❌ This command can only be used in a server!";
        if (!this.database) return "❌ Database is not configured.";
        if (!this.channel) return "❌ Unable to determine current channel.";

        // Check if this is a ticket channel
        const ticket = await this.database.getTicket(this.channel.id);
        if (!ticket) {
            return "❌ This command can only be used in a ticket channel.";
        }

        if (ticket.status === "closed") {
            return "❌ This ticket is closed.";
        }

        const settings = await this.database.getTicketSettings(this.guild.id);

        // Check if user is staff
        const isStaff = settings.support_role_id
            ? this.member?.roles.includes(settings.support_role_id)
            : this.member?.permissions.has(Constants.Permissions.MANAGE_CHANNELS);

        if (!isStaff) {
            return "❌ Only staff members can claim tickets.";
        }

        if (ticket.claimed_by) {
            if (ticket.claimed_by === this.author.id) {
                return "❌ You have already claimed this ticket.";
            }
            return `❌ This ticket is already claimed by <@${ticket.claimed_by}>.`;
        }

        try {
            await this.database.claimTicket(this.channel.id, this.author.id);

            this.success = true;
            return `✅ <@${this.author.id}> has claimed this ticket and will assist you shortly.`;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return `❌ Failed to claim ticket: ${err.message}`;
        }
    }

    static description = "Claim a ticket (staff only)";
    static aliases = ["take"];
    static dbRequired = true;
}

export default ClaimTicketCommand;
