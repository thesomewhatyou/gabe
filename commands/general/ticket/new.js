import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { createTicket } from "#utils/ticketUtils.js";

class NewTicketCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    const category = this.getOptionString("category") ?? this.args[0] ?? "general";

    const result = await createTicket(this.client, this.database, this.guild, this.author, category);

    this.success = result.success;
    return result.message;
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
