import { User } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class UserInfoCommand extends Command {
  async run() {
    const target = this.interaction?.data.target;
    if (!(target instanceof User)) {
      throw Error("Target is not a user");
    }

    const member = this.guild?.members.get(target.id);
    const createdAt = new Date(target.createdAt);
    const joinedAt = member?.joinedAt ? new Date(member.joinedAt) : null;

    const fields = [
      {
        name: "📛 Username",
        value: target.tag,
        inline: true,
      },
      {
        name: "🆔 User ID",
        value: target.id,
        inline: true,
      },
      {
        name: "📅 Account Created",
        value: `<t:${Math.floor(createdAt.getTime() / 1000)}:F>\n<t:${Math.floor(createdAt.getTime() / 1000)}:R>`,
        inline: false,
      },
    ];

    if (member) {
      if (joinedAt) {
        fields.push({
          name: "📥 Joined Server",
          value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>\n<t:${Math.floor(joinedAt.getTime() / 1000)}:R>`,
          inline: false,
        });
      }

      if (member.nick) {
        fields.push({
          name: "📝 Nickname",
          value: member.nick,
          inline: true,
        });
      }

      const roles = member.roles
        .map((roleId) => this.guild?.roles.get(roleId))
        .filter((role) => role && role.id !== this.guild?.id)
        .sort((a, b) => b.position - a.position);

      if (roles.length > 0) {
        const roleList = roles.map((role) => `<@&${role.id}>`).join(", ");
        fields.push({
          name: `🎭 Roles [${roles.length}]`,
          value: roleList.length > 1024 ? `${roleList.slice(0, 1021)}...` : roleList,
          inline: false,
        });
      }

      // Check for booster status
      if (member.premiumSince) {
        const boostingSince = new Date(member.premiumSince);
        fields.push({
          name: "💎 Server Booster",
          value: `Since <t:${Math.floor(boostingSince.getTime() / 1000)}:F>`,
          inline: false,
        });
      }
    }

    const embed = {
      embeds: [
        {
          title: `${target.bot ? "🤖 " : ""}User Information`,
          color: member?.color || 0xff0000,
          thumbnail: {
            url: target.avatarURL("png", 512),
          },
          fields: fields,
          footer: {
            text: target.bot ? "This user is a bot" : "User information",
          },
        },
      ],
    };

    return embed;
  }

  static description = "Get detailed information about a user";
  static slashAllowed = false;
}

export default UserInfoCommand;
