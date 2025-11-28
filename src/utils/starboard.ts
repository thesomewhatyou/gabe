import type {
  EventReaction,
  Member,
  Message,
  PossiblyUncachedMessage,
  Uncached,
  User,
} from "oceanic.js";
import { getString } from "#utils/i18n.js";
import type { EventParams, StarboardEntry, StarboardSettings } from "#utils/types.js";

const STARBOARD_COOLDOWN = 1000 * 60 * 60 * 24 * 7; // 7 days, used for pruning old records

type ReactionKind = "add" | "remove";

export default async function handleStarboardReaction(
  kind: ReactionKind,
  { client, database }: EventParams,
  rawMessage: PossiblyUncachedMessage & { author?: User | Uncached; member?: Member | Uncached },
  reactor: Member | User | Uncached,
  reaction: EventReaction,
) {
  if (!database) return;
  if (!rawMessage.guildID) return;
  if (!reaction.emoji.name && !reaction.emoji.id) return;

  const settings = await database.getStarboardSettings(rawMessage.guildID);
  if (!settings.enabled || !settings.channel_id) return;

  if (!matchesEmoji(settings.emoji, reaction.emoji.id, reaction.emoji.name)) return;

  const userId = reactor.id;
  if (!settings.allow_self && rawMessage.author && "id" in rawMessage.author && rawMessage.author.id === userId) return;

  const channel = await client.rest.channels.get(rawMessage.channelID).catch(() => null);
  if (!channel || !("guildID" in channel)) return;

  const targetChannel = await client.rest.channels.get(settings.channel_id).catch(() => null);
  if (!targetChannel) return;

  const message =
    isFullMessage(rawMessage)
      ? rawMessage
      : ((await client.rest.channels.getMessage(rawMessage.channelID, rawMessage.id).catch(() => null)) as Message | null);
  if (!message || message.author.id === client.user.id) return;
  if (!settings.allow_self && message.author.id === userId) return;
  if (!settings.allow_bots && message.author.bot) return;

  const entry =
    (await database.getStarboardEntry(rawMessage.guildID, rawMessage.id)) ??
    createEntry(rawMessage.guildID, rawMessage.id, rawMessage.channelID, message.author.id);
  entry.star_count = Math.max(0, entry.star_count + (kind === "add" ? 1 : -1));

  if (entry.star_count <= 0) {
    if (entry.starboard_message_id) {
      await deleteStarboardMessage(targetChannel.id, entry.starboard_message_id, client);
    }
    await database.deleteStarboardEntry(entry.guild_id, entry.message_id);
    return;
  }

  await database.upsertStarboardEntry(entry);
  await database.pruneStarboardEntries(entry.guild_id, Date.now() - STARBOARD_COOLDOWN);

  if (entry.star_count < settings.threshold) {
    if (entry.starboard_message_id) {
      await deleteStarboardMessage(targetChannel.id, entry.starboard_message_id, client);
      entry.starboard_message_id = null;
      await database.upsertStarboardEntry(entry);
    }
    return;
  }

  const embed = buildEmbed(settings, entry, message, rawMessage.channelID);

  if (entry.starboard_message_id) {
    await client.rest.channels
      .editMessage(targetChannel.id, entry.starboard_message_id, embed)
      .catch(() => undefined);
  } else {
    const created = await client.rest.channels.createMessage(targetChannel.id, embed).catch(() => null);
    if (created) {
      entry.starboard_message_id = created.id;
      await database.upsertStarboardEntry(entry);
    }
  }
}

function isFullMessage(message: PossiblyUncachedMessage): message is Message {
  return typeof (message as Message).author !== "undefined";
}

function matchesEmoji(configEmoji: string, emojiId?: string | null, emojiName?: string | null) {
  if (!configEmoji) return false;
  if (configEmoji.startsWith("<") && configEmoji.endsWith(">")) {
    const idMatch = configEmoji.match(/:(\d+)>$/);
    const id = idMatch?.[1];
    return id ? id === emojiId : false;
  }
  return configEmoji === emojiName || configEmoji === emojiId;
}

function createEntry(guildId: string, messageId: string, channelId: string, authorId: string): StarboardEntry {
  return {
    guild_id: guildId,
    message_id: messageId,
    channel_id: channelId,
    starboard_message_id: null,
    star_count: 0,
    author_id: authorId,
  };
}

async function deleteStarboardMessage(channelId: string, messageId: string, client: EventParams["client"]) {
  await client.rest.channels.deleteMessage(channelId, messageId).catch(() => undefined);
}

function buildEmbed(settings: StarboardSettings, entry: StarboardEntry, message: Message, jumpChannelId: string) {
  const attachment = message.attachments.first();
  const contentPreview = message.content?.slice(0, 2048) ?? "";

  return {
    content: `${settings.emoji} **${entry.star_count}** <#${jumpChannelId}>`,
    embeds: [
      {
        author: {
          name: message.author.username,
          iconURL: message.author.avatarURL(),
        },
        description: contentPreview.length > 0 ? contentPreview : getString("starboard.noContent"),
        color: 0xf1c40f,
        image: attachment ? { url: attachment.url } : undefined,
        fields: message.embeds
          .filter((embed) => embed.type === "image" && embed.url)
          .slice(0, 3)
          .map((embed) => ({ name: embed.url ?? "Image", value: embed.url ?? "" })),
        footer: {
          text: `ID: ${message.id}`,
        },
        timestamp: new Date(message.createdAt).toISOString(),
      },
    ],
    messageReference: {
      channelID: entry.channel_id,
      messageID: entry.message_id,
      guildID: entry.guild_id,
      failIfNotExists: false,
    },
    allowedMentions: {
      repliedUser: false,
    },
  };
}

