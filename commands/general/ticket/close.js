import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CloseTicketCommand extends Command {
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
            return "❌ This ticket is already closed.";
        }

        const settings = await this.database.getTicketSettings(this.guild.id);

        // Check permissions - ticket owner or staff can close
        const isTicketOwner = ticket.user_id === this.author.id;
        const isStaff = settings.support_role_id
            ? this.member?.roles.includes(settings.support_role_id)
            : this.member?.permissions.has(Constants.Permissions.MANAGE_CHANNELS);

        if (!isTicketOwner && !isStaff) {
            return "❌ You don't have permission to close this ticket.";
        }

        const reason = this.getOptionString("reason") ?? this.args.join(" ") || "No reason provided";

        try {
            // Close the ticket in database
            await this.database.closeTicket(this.channel.id, reason);

            // Send closing message
            await this.channel.createMessage({
                content: `🔒 **Ticket Closed**\n\n**Closed by:** <@${this.author.id}>\n**Reason:** ${reason}\n\nThis channel will be deleted in 10 seconds.`,
            });

            // Log to log channel if configured
            if (settings.log_channel_id) {
                try {
                    const logChannel = this.guild.channels.get(settings.log_channel_id);
                    if (logChannel && "createMessage" in logChannel) {
                        await logChannel.createMessage({
                            embeds: [{
                                color: 0xff6b6b,
                                title: "🎫 Ticket Closed",
                                fields: [
                                    { name: "Ticket ID", value: `#${ticket.id}`, inline: true },
                                    { name: "Opened By", value: `<@${ticket.user_id}>`, inline: true },
                                    { name: "Closed By", value: `<@${this.author.id}>`, inline: true },
                                    { name: "Category", value: ticket.category, inline: true },
                                    { name: "Reason", value: reason, inline: false },
                                ],
                                timestamp: new Date().toISOString(),
                            }],
                        });
                    }
                } catch {
                    // Ignore logging errors
                }
            }

            // Delete channel after delay
            setTimeout(async () => {
                try {
                    await this.channel?.delete();
                } catch {
                    // Channel may already be deleted
                }
            }, 10000);

            this.success = true;
            return null; // Message already sent above
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return `❌ Failed to close ticket: ${err.message}`;
        }
    }

    static flags = [
        {
            name: "reason",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "The reason for closing the ticket",
            required: false,
        },
    ];

    static description = "Close the current ticket";
    static aliases = ["end", "resolve"];
    static dbRequired = true;
}

export default CloseTicketCommand;
