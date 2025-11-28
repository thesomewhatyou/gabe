import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class RoleInfoCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "❌ This command can only be used in a server!";
    }

    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return "❌ I need permission to embed links to show role info!";
    }

    const roleInput = this.getOptionRole("role") ?? this.args?.join(" ");
    if (!roleInput) {
      this.success = false;
      return "❌ Please specify a role to get info about!";
    }

    await this.acknowledge();

    let role;
    if (typeof roleInput === "string") {
      const roleId = roleInput.replace(/<@&|>/g, "");
      role = this.guild.roles.get(roleId) ??
        this.guild.roles.find((r) => r.name.toLowerCase() === roleInput.toLowerCase()) ??
        this.guild.roles.find((r) => r.name.toLowerCase().includes(roleInput.toLowerCase()));
    } else {
      role = roleInput;
    }

    if (!role) {
      this.success = false;
      return "❌ Could not find that role!";
    }

    const createdAt = Math.floor(role.createdAt.getTime() / 1000);
    const memberCount = this.guild.members.filter((m) => m.roles.includes(role.id)).size;

    const keyPermissions = [
      "ADMINISTRATOR",
      "MANAGE_GUILD",
      "MANAGE_ROLES",
      "MANAGE_CHANNELS",
      "MANAGE_MESSAGES",
      "MANAGE_WEBHOOKS",
      "MANAGE_NICKNAMES",
      "MANAGE_EMOJIS_AND_STICKERS",
      "KICK_MEMBERS",
      "BAN_MEMBERS",
      "MODERATE_MEMBERS",
      "MENTION_EVERYONE",
    ];

    const rolePermissions = keyPermissions.filter((perm) => {
      const val = Constants.Permissions[perm];
      return val && role.permissions.has(val);
    });
    const permissionDisplay = rolePermissions.length > 0
      ? rolePermissions.map((p) => `\`${p.replace(/_/g, " ")}\``).join(", ")
      : "No key permissions";

    const fields = [
      {
        name: "🆔 Role ID",
        value: `\`${role.id}\``,
        inline: true,
      },
      {
        name: "🎨 Color",
        value: role.color ? `#${role.color.toString(16).padStart(6, "0").toUpperCase()}` : "None (default)",
        inline: true,
      },
      {
        name: "📊 Position",
        value: `${role.position} / ${this.guild.roles.size}`,
        inline: true,
      },
      {
        name: "👥 Members",
        value: memberCount.toLocaleString(),
        inline: true,
      },
      {
        name: "📅 Created",
        value: `<t:${createdAt}:F>\n(<t:${createdAt}:R>)`,
        inline: true,
      },
      {
        name: "🔔 Mentionable",
        value: role.mentionable ? "Yes" : "No",
        inline: true,
      },
      {
        name: "📌 Hoisted",
        value: role.hoist ? "Yes" : "No",
        inline: true,
      },
      {
        name: "🤖 Managed",
        value: role.managed ? "Yes (by integration)" : "No",
        inline: true,
      },
    ];

    if (role.unicodeEmoji) {
      fields.push({
        name: "😀 Icon",
        value: role.unicodeEmoji,
        inline: true,
      });
    }

    fields.push({
      name: "🔑 Key Permissions",
      value: permissionDisplay,
      inline: false,
    });

    const embed = {
      color: role.color || 0x5865f2,
      author: {
        name: `Role Info: ${role.name}`,
        iconURL: role.iconURL("png", 128) ?? undefined,
      },
      fields,
      footer: {
        text: `Requested by ${this.author.username}`,
        iconURL: this.author.avatarURL(),
      },
      timestamp: new Date().toISOString(),
    };

    if (role.iconURL("png", 128)) {
      embed.thumbnail = { url: role.iconURL("png", 128) };
    }

    return { embeds: [embed] };
  }

  static flags = [
    {
      name: "role",
      type: Constants.ApplicationCommandOptionTypes.ROLE,
      description: "The role to get info about",
      required: true,
      classic: true,
    },
  ];

  static description = "Get detailed information about a role";
  static aliases = ["role", "ri"];
}

export default RoleInfoCommand;
