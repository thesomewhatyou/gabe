import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class GiveRepCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    const rawInput = this.getOptionUser("user") ?? this.args[0];
    if (!rawInput) return "❌ Please mention a user to give rep to.";

    const user =
      typeof rawInput === "string"
        ? await this.client.rest.users.get(rawInput.replace(/[<@!>]/g, "")).catch(() => null)
        : rawInput;

    if (!user) return "❌ User not found.";
    if (user.id === this.author.id) return "❌ You can't give rep to yourself!";
    if (user.bot) return "❌ You can't give rep to bots!";

    // Check cooldown
    const canGive = await this.database.canGiveRep(this.guild.id, this.author.id, user.id);
    if (!canGive) {
      return "❌ You can only give rep to the same person once every 24 hours.";
    }

    // Determine if positive or negative rep
    // Check if the command was invoked as "-rep"
    const isNegative = this.cmdName?.startsWith("-") || this.getOptionString("type") === "negative";
    const amount = isNegative ? -1 : 1;
    const reasonArg = this.getOptionString("reason") ?? this.args.slice(1).join(" ");
    const reason = reasonArg ? reasonArg : null;

    await this.database.giveRep(this.guild.id, user.id, this.author.id, amount, reason ?? undefined);
    const newScore = await this.database.getRepScore(this.guild.id, user.id);

    const emoji = amount > 0 ? "⬆️" : "⬇️";
    const verb = amount > 0 ? "positive" : "negative";

    this.success = true;
    return `${emoji} You gave **${verb}** rep to <@${user.id}>!${reason ? `\n📝 *"${reason}"*` : ""}\n\nTheir new rep: **${newScore}**`;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to give rep to",
      required: true,
    },
    {
      name: "type",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Type of rep (positive or negative)",
      required: false,
      choices: [
        { name: "Positive (+rep)", value: "positive" },
        { name: "Negative (-rep)", value: "negative" },
      ],
    },
    {
      name: "reason",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Reason for the rep",
      required: false,
    },
  ];

  static description = "Give reputation to a user";
  static aliases = ["+rep", "-rep", "giverep"];
  static dbRequired = true;
}

export default GiveRepCommand;
