import { Message } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanMessage } from "#utils/misc.js";

class BookmarkMessageCommand extends Command {
  async run() {
    const targetMessage = this.interaction?.data.target;
    if (!(targetMessage instanceof Message)) {
      throw Error("Target is not a message");
    }

    const guildId = targetMessage.guildID ?? "@me";
    const channelId = targetMessage.channelID;
    const messageId = targetMessage.id;
    const messageUrl = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

    // Get message content
    const content = targetMessage.content ? cleanMessage(targetMessage, targetMessage.content).trim() : "";
    const hasAttachments = targetMessage.attachments.length > 0;
    const hasEmbeds = targetMessage.embeds.length > 0;

    const channelName = this.channel && "name" in this.channel ? this.channel.name : "Unknown Channel";
    const serverName = this.guild?.name ?? "Direct Message";

    const embed = {
      title: "🔖 Bookmarked Message",
      color: 0xff0000,
      description: content.length > 0 ? (content.length > 2048 ? content.slice(0, 2045) + "..." : content) : "*No text content*",
      fields: [
        {
          name: "📍 Location",
          value: `${serverName} > #${channelName}`,
          inline: true,
        },
        {
          name: "👤 Author",
          value: `${targetMessage.author.tag}`,
          inline: true,
        },
        {
          name: "🔗 Jump to Message",
          value: `[Click here](${messageUrl})`,
          inline: false,
        },
      ],
      timestamp: new Date(targetMessage.createdAt).toISOString(),
      footer: {
        text: "Bookmarked via Gabe",
      },
    };

    // Add attachment info if present
    if (hasAttachments) {
      const attachmentList = targetMessage.attachments.map((a) => `[${a.filename}](${a.url})`).join("\n");
      embed.fields.push({
        name: `📎 Attachments [${targetMessage.attachments.length}]`,
        value: attachmentList.length > 1024 ? attachmentList.slice(0, 1021) + "..." : attachmentList,
        inline: false,
      });
    }

    // Add note about embeds
    if (hasEmbeds) {
      embed.fields.push({
        name: "📰 Additional Content",
        value: `This message contains ${targetMessage.embeds.length} embed(s). Click the link above to view.`,
        inline: false,
      });
    }

    try {
      // Try to DM the user
      const dmChannel = await this.client.rest.users.createDM(this.author.id);
      await this.client.rest.channels.createMessage(dmChannel.id, {
        embeds: [embed],
      });

      this.success = true;
      return {
        content: "✅ Gabe says: Message bookmarked! Check your DMs.",
        flags: 64, // EPHEMERAL
      };
    } catch (error) {
      this.success = false;
      return {
        content: "❌ Gabe says: Couldn't DM you the bookmark. Make sure your DMs are open!",
        flags: 64, // EPHEMERAL
      };
    }
  }

  static description = "Bookmark this message (sends a DM with the link)";
  static slashAllowed = false;
  static ephemeral = true;
}

export default BookmarkMessageCommand;
