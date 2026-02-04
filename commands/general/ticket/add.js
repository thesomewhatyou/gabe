import { Constants, OverwriteTypes } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class AddToTicketCommand extends Command {
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

    // Check permissions - ticket owner or staff can add users
    const isTicketOwner = ticket.user_id === this.author.id;
    const isStaff = settings.support_role_id
      ? this.member?.roles.includes(settings.support_role_id)
      : this.member?.permissions.has(Constants.Permissions.MANAGE_CHANNELS);

    if (!isTicketOwner && !isStaff) {
      return "❌ You don't have permission to add users to this ticket.";
    }

    const user = this.getOptionUser("user") ?? this.args[0];
    if (!user) {
      return "❌ Please specify a user to add.";
    }

    const userToAdd = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;
    if (!userToAdd) {
      return "❌ User not found.";
    }

    try {
      await this.channel.editPermission(userToAdd.id, {
        allow:
          BigInt(Constants.Permissions.VIEW_CHANNEL) |
          BigInt(Constants.Permissions.SEND_MESSAGES) |
          BigInt(Constants.Permissions.READ_MESSAGE_HISTORY),
        type: OverwriteTypes.MEMBER,
      });

      this.success = true;
      return `✅ <@${userToAdd.id}> has been added to this ticket.`;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return `❌ Failed to add user: ${err.message}`;
    }
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to add to the ticket",
      required: true,
    },
  ];

  static description = "Add a user to the ticket";
  static dbRequired = true;
}

export default AddToTicketCommand;
