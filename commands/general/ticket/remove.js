import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class RemoveFromTicketCommand extends Command {
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

        // Check permissions - only staff can remove users
        const isStaff = settings.support_role_id
            ? this.member?.roles.includes(settings.support_role_id)
            : this.member?.permissions.has(Constants.Permissions.MANAGE_CHANNELS);

        if (!isStaff) {
            return "❌ Only staff members can remove users from tickets.";
        }

        const user = this.getOptionUser("user") ?? this.args[0];
        if (!user) {
            return "❌ Please specify a user to remove.";
        }

        const userToRemove = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;
        if (!userToRemove) {
            return "❌ User not found.";
        }

        // Don't allow removing the ticket owner
        if (userToRemove.id === ticket.user_id) {
            return "❌ You cannot remove the ticket owner.";
        }

        try {
            await this.channel.deletePermission(userToRemove.id, "Removed from ticket");

            this.success = true;
            return `✅ <@${userToRemove.id}> has been removed from this ticket.`;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return `❌ Failed to remove user: ${err.message}`;
        }
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to remove from the ticket",
            required: true,
        },
    ];

    static description = "Remove a user from the ticket";
    static dbRequired = true;
}

export default RemoveFromTicketCommand;
