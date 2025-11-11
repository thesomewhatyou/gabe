import { Constants, Permissions } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class PurgeCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ Gabe says: This only works in servers, chief.";
    if (!this.member) return "❌ Gabe says: I can't find you in this server.";
    if (!this.channel) return "❌ Gabe says: What channel are we even in?";

    const member = this.member;

    if (!member.permissions.has(Permissions.MANAGE_MESSAGES) && this.author.id !== process.env.OWNER) {
      return "❌ Gabe says: You don't have permission to manage messages. Back off!";
    }

    const amount = this.getOptionInteger("amount") ?? parseInt(this.args[0]) ?? 10;
    if (amount < 1 || amount > 100) {
      return "❌ Gabe says: I can only purge between 1 and 100 messages at a time.";
    }

    try {
      const myMember = this.guild.members.get(this.client.user.id);
      if (!myMember?.permissions.has(Permissions.MANAGE_MESSAGES)) {
        return "❌ Gabe says: I don't have permission to manage messages. Give me power!";
      }

      const messages = await this.channel.getMessages({ limit: amount + 1 });
      const messagesToDelete = messages.filter(
        (msg) => Date.now() - msg.timestamp.getTime() < 14 * 24 * 60 * 60 * 1000,
      );

      if (messagesToDelete.length === 0) {
        return "❌ Gabe says: No messages to delete (messages must be less than 14 days old).";
      }

      await this.channel.deleteMessages(
        messagesToDelete.map((m) => m.id),
        "Gabe's cleanup service",
      );

      this.success = true;
      const response = `🧹 **PURGED!** Gabe deleted ${messagesToDelete.length} messages. This place is cleaner now.`;

      const confirmMsg = await this.channel.createMessage({ content: response });
      setTimeout(() => {
        confirmMsg.delete().catch(() => {});
      }, 5000);

      return;
    } catch (error) {
      return `❌ Gabe says: Something went wrong while purging. ${error.message}`;
    }
  }

  static flags = [
    {
      name: "amount",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Number of messages to delete (1-100, default: 10)",
      minValue: 1,
      maxValue: 100,
    },
  ];

  static description = "Deletes multiple messages at once";
  static aliases = ["clear", "clean", "prune"];
  static requiresPermission = true;
}

export default PurgeCommand;
