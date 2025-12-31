import { ChannelTypes, Constants, OverwriteTypes } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class NewTicketCommand extends Command {
    async run() {
        this.success = false;

        if (!this.guild) return "❌ This command can only be used in a server!";
        if (!this.database) return "❌ Database is not configured.";

        // Check if tickets are enabled
        const settings = await this.database.getTicketSettings(this.guild.id);
        if (!settings.enabled) {
            return "❌ The ticket system is not enabled on this server.";
        }

        // Check if user has too many open tickets
        const userTickets = await this.database.getUserTickets(this.guild.id, this.author.id);
        if (userTickets.length >= settings.max_open_per_user) {
            return `❌ You already have ${userTickets.length} open ticket(s). Please close an existing ticket before opening a new one.`;
        }

        const category = this.getOptionString("category") ?? this.args[0] ?? "general";

        // Create the ticket channel
        const ticketNumber = Date.now().toString(36).slice(-4);
        const channelName = `ticket-${this.author.username.toLowerCase().replace(/[^a-z0-9]/g, "")}-${ticketNumber}`;

        try {
            // Build permission overwrites
            const permissionOverwrites = [
                // Deny @everyone
                {
                    id: this.guild.id,
                    type: OverwriteTypes.ROLE,
                    deny: BigInt(Constants.Permissions.VIEW_CHANNEL),
                    allow: 0n,
                },
                // Allow ticket creator
                {
                    id: this.author.id,
                    type: OverwriteTypes.MEMBER,
                    allow: BigInt(Constants.Permissions.VIEW_CHANNEL) | BigInt(Constants.Permissions.SEND_MESSAGES) | BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
                    deny: 0n,
                },
                // Allow bot
                {
                    id: this.client.user.id,
                    type: OverwriteTypes.MEMBER,
                    allow: BigInt(Constants.Permissions.VIEW_CHANNEL) | BigInt(Constants.Permissions.SEND_MESSAGES) | BigInt(Constants.Permissions.MANAGE_CHANNELS) | BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
                    deny: 0n,
                },
            ];

            // Add support role if configured
            if (settings.support_role_id) {
                permissionOverwrites.push({
                    id: settings.support_role_id,
                    type: OverwriteTypes.ROLE,
                    allow: BigInt(Constants.Permissions.VIEW_CHANNEL) | BigInt(Constants.Permissions.SEND_MESSAGES) | BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
                    deny: 0n,
                });
            }

            const ticketChannel = await this.guild.createChannel(ChannelTypes.GUILD_TEXT, {
                name: channelName,
                parentID: settings.category_id ?? undefined,
                permissionOverwrites,
                topic: `Support ticket created by ${this.author.tag} | Category: ${category}`,
            });

            // Save ticket to database
            const ticketId = await this.database.createTicket(this.guild.id, ticketChannel.id, this.author.id, category);

            // Send initial message in the ticket
            const welcomeMessage = settings.ticket_message
                ? settings.ticket_message
                    .replace(/\{user\}/g, `<@${this.author.id}>`)
                    .replace(/\{username\}/g, this.author.username)
                    .replace(/\{category\}/g, category)
                    .replace(/\{ticket_id\}/g, ticketId.toString())
                : `🎫 **Ticket #${ticketId}**

Hello <@${this.author.id}>! A staff member will be with you shortly.

**Category:** ${category}

Please describe your issue in detail while you wait.`;

            await ticketChannel.createMessage({
                content: welcomeMessage,
                allowedMentions: { users: [this.author.id] },
            });

            this.success = true;
            return `✅ Your ticket has been created! <#${ticketChannel.id}>`;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return `❌ Failed to create ticket: ${err.message}`;
        }
    }

    static flags = [
        {
            name: "category",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "The category of support needed",
            required: false,
        },
    ];

    static description = "Create a new support ticket";
    static aliases = ["create", "open"];
    static dbRequired = true;
}

export default NewTicketCommand;
