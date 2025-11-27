import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class UserInfoCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return "❌ I need permission to embed links to show user info!";
    }

    await this.acknowledge();

    const targetUser = this.getOptionUser("user") ?? this.author;
    const targetMember = this.guild?.members.get(targetUser.id);

    const createdAt = Math.floor(targetUser.createdAt.getTime() / 1000);
    const avatarURL = targetUser.avatarURL("png", 1024);
    const bannerURL = targetUser.bannerURL("png", 1024);

    const fields = [
      {
        name: "👤 Username",
        value: targetUser.username,
        inline: true,
      },
      {
        name: "🏷️ Display Name",
        value: targetUser.globalName ?? targetUser.username,
        inline: true,
      },
      {
        name: "🆔 User ID",
        value: `\`${targetUser.id}\``,
        inline: true,
      },
      {
        name: "📅 Account Created",
        value: `<t:${createdAt}:F>\n(<t:${createdAt}:R>)`,
        inline: true,
      },
    ];

    if (targetUser.bot) {
      fields.push({
        name: "🤖 Bot",
        value: "Yes",
        inline: true,
      });
    }

    if (targetMember) {
      const joinedAt = Math.floor(targetMember.joinedAt.getTime() / 1000);
      fields.push({
        name: "📥 Joined Server",
        value: `<t:${joinedAt}:F>\n(<t:${joinedAt}:R>)`,
        inline: true,
      });

      const roles = targetMember.roles
        .map((roleId) => this.guild.roles.get(roleId))
        .filter((role) => role && role.id !== this.guild.id)
        .sort((a, b) => b.position - a.position);

      if (roles.length > 0) {
        const roleDisplay = roles.length > 10
          ? `${roles.slice(0, 10).map((r) => `<@&${r.id}>`).join(", ")} +${roles.length - 10} more`
          : roles.map((r) => `<@&${r.id}>`).join(", ");

        fields.push({
          name: `🎭 Roles (${roles.length})`,
          value: roleDisplay,
          inline: false,
        });
      }

      if (targetMember.premiumSince) {
        const boostingSince = Math.floor(targetMember.premiumSince.getTime() / 1000);
        fields.push({
          name: "💎 Boosting Since",
          value: `<t:${boostingSince}:F>`,
          inline: true,
        });
      }

      if (targetMember.nickname) {
        fields.splice(2, 0, {
          name: "📛 Nickname",
          value: targetMember.nickname,
          inline: true,
        });
      }
    }

    const embed = {
      color: targetMember?.roles.length
        ? this.guild.roles.get(targetMember.roles.sort((a, b) => {
            const roleA = this.guild.roles.get(a);
            const roleB = this.guild.roles.get(b);
            return (roleB?.position ?? 0) - (roleA?.position ?? 0);
          })[0])?.color ?? 0x5865f2
        : 0x5865f2,
      author: {
        name: `${targetUser.globalName ?? targetUser.username}'s Info`,
        iconURL: avatarURL,
      },
      thumbnail: {
        url: avatarURL,
      },
      fields,
      footer: {
        text: `Requested by ${this.author.username}`,
        iconURL: this.author.avatarURL(),
      },
      timestamp: new Date().toISOString(),
    };

    if (bannerURL) {
      embed.image = { url: bannerURL };
    }

    return { embeds: [embed] };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to get info about (defaults to yourself)",
      classic: true,
    },
  ];

  static description = "Get detailed information about a user";
  static aliases = ["user", "whois", "ui"];
}

export default UserInfoCommand;
