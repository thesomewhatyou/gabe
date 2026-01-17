import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { closeTicket } from "#utils/ticketUtils.js";

class CloseTicketCommand extends Command {
    async run() {
        this.success = false;

        if (!this.guild) return "❌ This command can only be used in a server!";
        if (!this.database) return "❌ Database is not configured.";
        if (!this.channel) return "❌ Unable to determine current channel.";

        const reasonArg = this.getOptionString("reason") ?? this.args.join(" ");
        const reason = reasonArg ? reasonArg : "No reason provided";

        try {
            const result = await closeTicket(this.database, this.channel, this.guild, this.author, reason);

            if (result.success) {
                this.success = true;
                return null;
            } else {
                return result.message;
            }
        } catch (e) {
            return `❌ An error occurred while closing the ticket: ${e}`;
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