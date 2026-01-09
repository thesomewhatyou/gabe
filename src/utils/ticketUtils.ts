import { ButtonStyles, ChannelTypes, ComponentTypes, Constants, OverwriteTypes, type Client, type Guild, type TextChannel, type User } from "oceanic.js";
import { randomBytes } from "node:crypto";
import type { DatabasePlugin } from "../database.js";

export async function createTicket(
  client: Client,
  database: DatabasePlugin,
  guild: Guild,
  user: User,
  category: string = "general"
): Promise<{ success: boolean; message: string; channelId?: string }> {
  // Check if tickets are enabled
  const settings = await database.getTicketSettings(guild.id);
  if (!settings.enabled) {
    return { success: false, message: "❌ The ticket system is not enabled on this server." };
  }

  // Check if user has too many open tickets
  const userTickets = await database.getUserTickets(guild.id, user.id);
  if (userTickets.length >= settings.max_open_per_user) {
    return {
      success: false,
      message: `❌ You already have ${userTickets.length} open ticket(s). Please close an existing ticket before opening a new one.`,
    };
  }

  // Create the ticket channel
  const ticketNumber = randomBytes(2).toString("hex");
  let sanitizedName = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!sanitizedName) sanitizedName = "user";
  const channelName = `ticket-${sanitizedName}-${ticketNumber}`;

  let ticketChannel: TextChannel | undefined;

  try {
    // Build permission overwrites
    const permissionOverwrites = [
      // Deny @everyone
      {
        id: guild.id,
        type: OverwriteTypes.ROLE,
        deny: BigInt(Constants.Permissions.VIEW_CHANNEL),
        allow: 0n,
      },
      // Allow ticket creator
      {
        id: user.id,
        type: OverwriteTypes.MEMBER,
        allow:
          BigInt(Constants.Permissions.VIEW_CHANNEL) |
          BigInt(Constants.Permissions.SEND_MESSAGES) |
          BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
        deny: 0n,
      },
      // Allow bot
      {
        id: client.user.id,
        type: OverwriteTypes.MEMBER,
        allow:
          BigInt(Constants.Permissions.VIEW_CHANNEL) |
          BigInt(Constants.Permissions.SEND_MESSAGES) |
          BigInt(Constants.Permissions.MANAGE_CHANNELS) |
          BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
        deny: 0n,
      },
    ];

    // Add support role if configured
    if (settings.support_role_id) {
      permissionOverwrites.push({
        id: settings.support_role_id,
        type: OverwriteTypes.ROLE,
        allow:
          BigInt(Constants.Permissions.VIEW_CHANNEL) |
          BigInt(Constants.Permissions.SEND_MESSAGES) |
          BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
        deny: 0n,
      });
    }

    ticketChannel = await guild.createChannel(ChannelTypes.GUILD_TEXT, {
      name: channelName,
      parentID: settings.category_id ?? undefined,
      permissionOverwrites,
      topic: `Support ticket created by ${user.tag} | Category: ${category}`,
    });

    // Save ticket to database
    const ticketId = await database.createTicket(guild.id, ticketChannel.id, user.id, category);

    // Send initial message in the ticket
    const welcomeMessage = settings.ticket_message
      ? settings.ticket_message
          .replace(/\{user\}/g, `<@${user.id}>`)
          .replace(/\{username\}/g, user.username)
          .replace(/\{category\}/g, category)
          .replace(/\{ticket_id\}/g, ticketId.toString())
      : `🎫 **Ticket #${ticketId}**

Hello <@${user.id}>! A staff member will be with you shortly.

**Category:** ${category}

Please describe your issue in detail while you wait.`;

    await ticketChannel.createMessage({
      content: welcomeMessage,
      allowedMentions: { users: [user.id] },
      components: [
        {
          type: ComponentTypes.ACTION_ROW,
          components: [
            {
              type: ComponentTypes.BUTTON,
              style: ButtonStyles.DANGER,
              label: "Close Ticket",
              customID: "ticket_close",
              emoji: { name: "🔒" },
            },
          ],
        },
      ],
    });

    return { success: true, message: `✅ Your ticket has been created! <#${ticketChannel.id}>`, channelId: ticketChannel.id };
  } catch (error) {
    if (ticketChannel) {
      try {
        await ticketChannel.delete();
      } catch {
        // Ignore deletion errors during cleanup
      }
    }
    const err = error instanceof Error ? error : new Error(String(error));
    return { success: false, message: `❌ Failed to create ticket: ${err.message}` };
  }
}

export async function closeTicket(
  database: DatabasePlugin,
  channel: TextChannel,
  guild: Guild,
  user: User,
  reason: string = "No reason provided"
): Promise<{ success: boolean; message: string }> {
  // Check if this is a ticket channel
  const ticket = await database.getTicket(channel.id);
  if (!ticket) {
    return { success: false, message: "❌ This command can only be used in a ticket channel." };
  }

  if (ticket.status === "closed") {
    return { success: false, message: "❌ This ticket is already closed." };
  }

  const settings = await database.getTicketSettings(guild.id);

  // Check permissions - ticket owner or staff can close
  const isTicketOwner = ticket.user_id === user.id;
  const member = guild.members.get(user.id);
  const isStaff = settings.support_role_id
    ? member?.roles.includes(settings.support_role_id)
    : member?.permissions.has(Constants.Permissions.MANAGE_CHANNELS);

  if (!isTicketOwner && !isStaff) {
    return { success: false, message: "❌ You don't have permission to close this ticket." };
  }

  try {
    // Close the ticket in database
    await database.closeTicket(channel.id, reason);

    // Send closing message
    await channel.createMessage({
      content: `🔒 **Ticket Closed**\n\n**Closed by:** <@${user.id}>\n**Reason:** ${reason}\n\nThis channel will be deleted in 10 seconds.`,
    });

    // Log to log channel if configured
    if (settings.log_channel_id) {
      try {
        const logChannel = guild.channels.get(settings.log_channel_id);
        if (logChannel && "createMessage" in logChannel) {
          await logChannel.createMessage({
            embeds: [
              {
                color: 0xff6b6b,
                title: "🎫 Ticket Closed",
                fields: [
                  { name: "Ticket ID", value: `#${ticket.id}`, inline: true },
                  { name: "Opened By", value: `<@${ticket.user_id}>`, inline: true },
                  { name: "Closed By", value: `<@${user.id}>`, inline: true },
                  { name: "Category", value: ticket.category, inline: true },
                  { name: "Reason", value: reason, inline: false },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
        }
      } catch {
        // Ignore logging errors
      }
    }

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await channel?.delete();
      } catch {
        // Channel may already be deleted
      }
    }, 10000);

    return { success: true, message: "Ticket closed" };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { success: false, message: `❌ Failed to close ticket: ${err.message}` };
  }
}

