import Command from "#cmd-classes/command.js";

class ServerInfoCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "❌ This command can only be used in a server!";
    }

    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return "❌ I need permission to embed links to show server info!";
    }

    await this.acknowledge();

    const guild = this.guild;
    const owner = guild.ownerID ? await this.client.rest.users.get(guild.ownerID).catch(() => null) : null;
    const createdAt = Math.floor(guild.createdAt.getTime() / 1000);

    const boostTierNames = {
      0: "None",
      1: "Tier 1",
      2: "Tier 2",
      3: "Tier 3",
    };

    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High",
    };

    const explicitContentFilters = {
      0: "Disabled",
      1: "Members without roles",
      2: "All members",
    };

    const totalMembers = guild.memberCount ?? guild.members.size;
    const botCount = guild.members.filter((m) => m.user?.bot).size;
    const humanCount = totalMembers - botCount;

    const textChannels = guild.channels.filter((c) => c.type === 0).size;
    const voiceChannels = guild.channels.filter((c) => c.type === 2).size;
    const categories = guild.channels.filter((c) => c.type === 4).size;
    const forumChannels = guild.channels.filter((c) => c.type === 15).size;
    const stageChannels = guild.channels.filter((c) => c.type === 13).size;

    const fields = [
      {
        name: "👑 Owner",
        value: owner ? `${owner.username} (<@${owner.id}>)` : "Unknown",
        inline: true,
      },
      {
        name: "🆔 Server ID",
        value: `\`${guild.id}\``,
        inline: true,
      },
      {
        name: "📅 Created",
        value: `<t:${createdAt}:F>\n(<t:${createdAt}:R>)`,
        inline: true,
      },
      {
        name: `👥 Members (${totalMembers.toLocaleString()})`,
        value: `👤 Humans: ${humanCount.toLocaleString()}\n🤖 Bots: ${botCount.toLocaleString()}`,
        inline: true,
      },
      {
        name: `💬 Channels (${guild.channels.size})`,
        value: [
          `📝 Text: ${textChannels}`,
          `🔊 Voice: ${voiceChannels}`,
          categories > 0 ? `📁 Categories: ${categories}` : null,
          forumChannels > 0 ? `📋 Forums: ${forumChannels}` : null,
          stageChannels > 0 ? `🎭 Stages: ${stageChannels}` : null,
        ].filter(Boolean).join("\n"),
        inline: true,
      },
      {
        name: `🎭 Roles`,
        value: `${guild.roles.size} roles`,
        inline: true,
      },
      {
        name: "💎 Boost Status",
        value: `Level: **${boostTierNames[guild.premiumTier]}**\nBoosts: **${guild.premiumSubscriptionCount ?? 0}**`,
        inline: true,
      },
      {
        name: "🔒 Verification",
        value: verificationLevels[guild.verificationLevel] ?? "Unknown",
        inline: true,
      },
      {
        name: "🛡️ Content Filter",
        value: explicitContentFilters[guild.explicitContentFilter] ?? "Unknown",
        inline: true,
      },
    ];

    if (guild.vanityURLCode) {
      fields.push({
        name: "🔗 Vanity URL",
        value: `discord.gg/${guild.vanityURLCode}`,
        inline: true,
      });
    }

    const features = guild.features;
    if (features && features.length > 0) {
      const featureDisplay = features
        .map((f) => f.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        .slice(0, 10)
        .join(", ");

      fields.push({
        name: `✨ Features (${features.length})`,
        value: features.length > 10 ? `${featureDisplay}, +${features.length - 10} more` : featureDisplay,
        inline: false,
      });
    }

    const embed = {
      color: 0x5865f2,
      author: {
        name: guild.name,
        iconURL: guild.iconURL("png", 1024),
      },
      thumbnail: {
        url: guild.iconURL("png", 1024),
      },
      fields,
      footer: {
        text: `Requested by ${this.author.username}`,
        iconURL: this.author.avatarURL(),
      },
      timestamp: new Date().toISOString(),
    };

    if (guild.bannerURL("png", 1024)) {
      embed.image = { url: guild.bannerURL("png", 1024) };
    } else if (guild.splashURL("png", 1024)) {
      embed.image = { url: guild.splashURL("png", 1024) };
    }

    return { embeds: [embed] };
  }

  static description = "Get detailed information about the current server";
  static aliases = ["server", "guild", "guildinfo", "si"];
}

export default ServerInfoCommand;
