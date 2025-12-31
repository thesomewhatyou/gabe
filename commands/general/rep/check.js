import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CheckRepCommand extends Command {
    async run() {
        this.success = false;

        if (!this.guild) return "❌ This command can only be used in a server!";
        if (!this.database) return "❌ Database is not configured.";

        const rawInput = this.getOptionUser("user") ?? this.args[0];
        const user = rawInput
            ? typeof rawInput === "string"
                ? await this.client.rest.users.get(rawInput.replace(/[<@!>]/g, "")).catch(() => null)
                : rawInput
            : this.author;

        if (!user) return "❌ User not found.";

        const score = await this.database.getRepScore(this.guild.id, user.id);
        const history = await this.database.getRepHistory(this.guild.id, user.id, 5);

        let response = `⭐ **${user.id === this.author.id ? "Your" : `${user.username}'s`} Reputation**\n\n`;
        response += `**Score:** ${score > 0 ? "+" : ""}${score}\n`;

        if (history.length > 0) {
            response += `\n**Recent:**\n`;
            for (const entry of history) {
                const emoji = entry.amount > 0 ? "⬆️" : "⬇️";
                const reasonText = entry.reason ? ` - *"${entry.reason}"*` : "";
                response += `${emoji} from <@${entry.from_user_id}>${reasonText}\n`;
            }
        }

        this.success = true;
        return response;
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to check rep for (defaults to yourself)",
            required: false,
        },
    ];

    static description = "Check a user's reputation score";
    static aliases = ["score"];
    static dbRequired = true;
}

export default CheckRepCommand;
