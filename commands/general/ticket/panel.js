import { ComponentTypes, ButtonStyles, Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class TicketPanelCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    // Only admins can create panels
    if (!this.member?.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
      return "❌ You need Administrator permission to create a ticket panel.";
    }

    const settings = await this.database.getTicketSettings(this.guild.id);
    if (!settings.enabled) {
      return "❌ Please enable the ticket system first with `ticket setup enable`.";
    }

    const title = this.getOptionString("title") ?? "🎫 Support Tickets";
    const description =
      this.getOptionString("description") ??
      "Need help? Click the button below to create a support ticket.\n\nA private channel will be created where you can describe your issue.";

    try {
      await this.channel?.createMessage({
        embeds: [
          {
            color: 0x5865f2,
            title,
            description,
            footer: {
              text: "Click the button below to create a ticket",
            },
          },
        ],
        components: [
          {
            type: ComponentTypes.ACTION_ROW,
            components: [
              {
                type: ComponentTypes.BUTTON,
                style: ButtonStyles.PRIMARY,
                label: "Create Ticket",
                customID: "ticket_create",
                emoji: { name: "🎫" },
              },
            ],
          },
        ],
      });

      this.success = true;
      return null; // Panel message is the response
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return `❌ Failed to create panel: ${err.message}`;
    }
  }

  static flags = [
    {
      name: "title",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The title of the ticket panel",
      required: false,
    },
    {
      name: "description",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The description of the ticket panel",
      required: false,
    },
  ];

  static description = "Create a ticket panel with a button (admin only)";
  static dbRequired = true;
}

export default TicketPanelCommand;
