import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class RenameTicketCommand extends Command {
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

    // Check permissions - ticket owner or staff can rename
    const isTicketOwner = ticket.user_id === this.author.id;
    const isStaff = settings.support_role_id
      ? this.member?.roles.includes(settings.support_role_id)
      : this.member?.permissions.has(Constants.Permissions.MANAGE_CHANNELS);

    if (!isTicketOwner && !isStaff) {
      return "❌ You don't have permission to rename this ticket.";
    }

    const newName = this.getOptionString("name") ?? this.args.join("-");
    if (!newName) {
      return "❌ Please specify a new name for the ticket.";
    }

    // Sanitize channel name
    const sanitizedName = newName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 100);
    if (!sanitizedName) {
      return "❌ Invalid channel name.";
    }

    try {
      await this.channel.edit({
        name: sanitizedName,
      });

      this.success = true;
      return `✅ Ticket renamed to **${sanitizedName}**.`;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return `❌ Failed to rename ticket: ${err.message}`;
    }
  }

  static flags = [
    {
      name: "name",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The new name for the ticket channel",
      required: true,
    },
  ];

  static description = "Rename the ticket channel";
  static dbRequired = true;
}

export default RenameTicketCommand;
