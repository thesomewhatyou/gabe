import { Constants, Message, ComponentInteraction } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { stolenEmojis, collectors } from "#utils/collections.js";
import InteractionCollector from "#pagination/awaitinteractions.js";

class StealEmojiCommand extends Command {
  async run() {
    const message = this.interaction?.data.target;
    if (!(message instanceof Message)) throw Error("Target is not a message");

    // Extract all emojis from the message
    const emojis = this.extractEmojis(message.content);

    if (emojis.length === 0) {
      this.success = false;
      return this.getString("commands.responses.steal-emoji.noEmojis");
    }

    // If multiple emojis, let user pick one
    if (emojis.length > 1) {
      return await this.handleMultipleEmojis(emojis);
    }

    // Single emoji - steal it directly
    return await this.stealEmoji(emojis[0]);
  }

  extractEmojis(content) {
    const emojis = [];

    // Extract custom Discord emojis: <:name:id> or <a:name:id> (animated)
    const customMatches = content.matchAll(/<(a?):([^:]+):(\d+)>/g);
    for (const match of customMatches) {
      const isAnimated = match[1] === "a";
      const name = match[2];
      const id = match[3];
      const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`;
      emojis.push({
        name,
        url,
        id,
        type: "custom",
        animated: isAnimated,
      });
    }

    // Extract Unicode emojis
    const unicodeMatches = content.match(/\p{RGI_Emoji}/gv);
    if (unicodeMatches) {
      for (const emoji of unicodeMatches) {
        const codePoints = [...emoji].map((v) => v.codePointAt(0)?.toString(16)).join("-");
        const name = `emoji_${codePoints.replace(/-/g, "_")}`;
        const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codePoints}.png`;
        emojis.push({
          name,
          url,
          emoji,
          type: "unicode",
          animated: false,
        });
      }
    }

    return emojis;
  }

  async handleMultipleEmojis(emojis) {
    // Create select menu for user to pick emoji
    const options = emojis.slice(0, 25).map((emoji, index) => ({
      label: emoji.type === "custom" ? emoji.name : emoji.emoji,
      value: index.toString(),
      description: emoji.type === "custom" ? `Custom ${emoji.animated ? "animated " : ""}emoji` : "Unicode emoji",
      emoji: emoji.type === "unicode" ? { name: emoji.emoji } : { id: emoji.id, name: emoji.name },
    }));

    const response = await this.interaction.createFollowup({
      content: this.getString("commands.responses.steal-emoji.pickEmoji", { params: { count: emojis.length.toString() } }),
      components: [
        {
          type: Constants.ComponentTypes.ACTION_ROW,
          components: [
            {
              type: Constants.ComponentTypes.STRING_SELECT,
              customID: "steal_emoji_select",
              placeholder: this.getString("commands.responses.steal-emoji.selectPlaceholder"),
              options,
            },
          ],
        },
      ],
      flags: Constants.MessageFlags.EPHEMERAL,
    });

    const responseMessage = (await response.getMessage()) ?? (await this.interaction.getOriginal());

    // Set up collector for user selection
    const collector = new InteractionCollector(this.client, responseMessage);
    let selected = false;

    collector.on("interaction", async (interaction) => {
      if (interaction.user.id !== this.author.id || interaction.data.customID !== "steal_emoji_select") {
        return;
      }

      selected = true;
      const selectedIndex = parseInt(interaction.data.values.raw[0]);
      const selectedEmoji = emojis[selectedIndex];

      try {
        await interaction.deferUpdate();
      } catch (e) {
        return;
      }

      await interaction.editParent({
        content: this.getString("commands.responses.steal-emoji.stealing"),
        components: [],
      });

      const result = await this.stealEmoji(selectedEmoji);
      await interaction.editParent({
        content: result,
        components: [],
      });

      collector.stop();
    });

    collector.on("end", async () => {
      if (selected) return; // User made a selection, don't show timeout message
      try {
        await responseMessage.edit({
          content: this.getString("commands.responses.steal-emoji.timeout"),
          components: [],
        });
      } catch (e) {
        // Message might have been deleted
      }
    });

    collectors.set(responseMessage.id, collector);

    return; // Don't return anything as we've handled the response
  }

  async stealEmoji(emoji) {
    try {
      // Download the emoji
      const response = await fetch(emoji.url);
      if (!response.ok) {
        this.success = false;
        return this.getString("commands.responses.steal-emoji.downloadFailed");
      }

      const buffer = await response.arrayBuffer();
      const size = buffer.byteLength;

      // Discord's emoji size limit is 256KB for standard, 512KB for boosted servers
      const maxSize = this.guild?.premiumTier >= 2 ? 524288 : 262144;

      // Try to upload to Discord
      if (size <= maxSize && this.guild && this.permissions.has("MANAGE_GUILD_EXPRESSIONS")) {
        try {
          const newEmoji = await this.guild.createEmoji({
            name: emoji.name.substring(0, 32), // Discord name limit
            image: `data:image/${emoji.animated ? "gif" : "png"};base64,${Buffer.from(buffer).toString("base64")}`,
          });

          return this.getString("commands.responses.steal-emoji.success", {
            params: { emoji: `<${emoji.animated ? "a" : ""}:${newEmoji.name}:${newEmoji.id}>` },
          });
        } catch (error) {
          // Failed to upload to Discord, fall through to RAM storage
        }
      }

      // Store in RAM temporarily if too big or upload failed
      const emojiId = `${this.guild?.id ?? "dm"}_${this.author.id}_${Date.now()}`;
      const emojiData = {
        name: emoji.name,
        buffer: Buffer.from(buffer),
        animated: emoji.animated,
        guildId: this.guild?.id,
        userId: this.author.id,
      };

      stolenEmojis.set(emojiId, emojiData);

      // Determine reason for RAM storage
      let reason;
      if (size > maxSize) {
        reason = this.getString("commands.responses.steal-emoji.tooBig", {
          params: {
            size: (size / 1024).toFixed(1),
            maxSize: (maxSize / 1024).toFixed(0),
          },
        });
      } else if (!this.guild) {
        reason = this.getString("commands.responses.steal-emoji.noDM");
      } else if (!this.permissions.has("MANAGE_GUILD_EXPRESSIONS")) {
        reason = this.getString("commands.responses.steal-emoji.noPermission");
      } else {
        reason = this.getString("commands.responses.steal-emoji.uploadFailed");
      }

      return this.getString("commands.responses.steal-emoji.storedInRAM", {
        params: {
          name: emoji.name,
          reason,
        },
      });
    } catch (error) {
      this.success = false;
      return this.getString("commands.responses.steal-emoji.error", {
        params: { error: error.message },
      });
    }
  }

  static ephemeral = true;
  static slashAllowed = false;
}

export default StealEmojiCommand;
