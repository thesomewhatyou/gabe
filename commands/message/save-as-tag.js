import { Message, Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanMessage } from "#utils/misc.js";

const blacklist = ["create", "add", "edit", "remove", "delete", "list", "random", "own", "owner"];

class SaveAsTagCommand extends Command {
  async run() {
    if (!this.database) {
      return "❌ Gabe says: Database isn't configured. Can't save tags!";
    }

    if (!this.guild) {
      return "❌ Gabe says: Tags only work in servers, buddy.";
    }

    const targetMessage = this.interaction?.data.target;
    if (!(targetMessage instanceof Message)) {
      throw Error("Target is not a message");
    }

    // Check permissions
    const owners = process.env.OWNER?.split(",") ?? [];
    const privileged = this.memberPermissions.has("ADMINISTRATOR") || owners.includes(this.author.id);
    const guild = await this.database.getGuild(this.guild.id);
    const setConv = new Set(guild.tag_roles);

    if (
      !privileged &&
      !setConv.has(this.guild.id) &&
      (!this.member || this.member.roles.filter((r) => setConv.has(r)).length === 0)
    ) {
      return "❌ Gabe says: You don't have permission to create tags. Nice try!";
    }

    // Get message content
    const baseContent = targetMessage.content ? cleanMessage(targetMessage, targetMessage.content).trim() : "";
    let content = baseContent;

    // Try to get content from embeds if message has no text
    if (!content) {
      const firstEmbed = targetMessage.embeds.find((embed) => embed.description?.trim() || embed.title?.trim());
      if (firstEmbed) {
        if (firstEmbed.title && firstEmbed.description) {
          content = `${firstEmbed.title}\n\n${firstEmbed.description}`;
        } else {
          content = firstEmbed.description?.trim() ?? firstEmbed.title?.trim() ?? "";
        }
      }
    }

    // Check for attachments
    if (!content && targetMessage.attachments.length > 0) {
      const urls = targetMessage.attachments.map((a) => a.url).join("\n");
      content = urls;
    }

    if (!content || !content.trim()) {
      return "❌ Gabe says: That message has no content to save. What am I supposed to do with nothing?";
    }

    // Generate a tag name based on the first few words or timestamp
    const words = content.split(/\s+/).slice(0, 3).join("-");
    const sanitized = words.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
    const tagName = sanitized || `msg-${Date.now()}`;

    // Check if tag name is blacklisted
    if (blacklist.includes(tagName)) {
      return `❌ Gabe says: Can't use "${tagName}" as a tag name. Try renaming it with \`/tags edit\`.`;
    }

    // Check if tag already exists
    const existingTag = await this.database.getTag(this.guild.id, tagName);
    if (existingTag) {
      return `❌ Gabe says: A tag named "${tagName}" already exists. Delete it first or use \`/tags edit\` to change it.`;
    }

    // Save the tag
    try {
      await this.database.setTag(
        {
          name: tagName,
          content: content,
          author: this.author.id,
        },
        this.guild,
      );

      this.success = true;
      return `✅ **Saved!** Message content saved as tag: \`${tagName}\`\n*Use it with:* \`/tags get ${tagName}\` or just \`${tagName}\``;
    } catch (error) {
      return `❌ Gabe says: Something went wrong saving the tag. ${error.message}`;
    }
  }

  static description = "Save a message's content as a server tag";
  static slashAllowed = false;
  static dbRequired = true;
  static directAllowed = false;
}

export default SaveAsTagCommand;
