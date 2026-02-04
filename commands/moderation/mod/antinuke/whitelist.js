import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeWhitelistCommand extends Command {
  async run() {
    this.success = false;
    if (!this.guild) return "❌ This only works in servers.";
    if (!this.member) return "❌ I can't find you in this server.";
    if (!this.database) return "❌ Database not available.";

    // Check permissions - only admins or bot owners
    if (!this.member.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
      return "❌ You need Administrator permissions to manage anti-nuke whitelist.";
    }

    const action = this.options?.action ?? this.getOptionString("action") ?? this.args[0];
    const user = this.options?.user ?? this.getOptionUser("user");
    const role = this.options?.role ?? this.getOptionRole("role");

    if (!action || !["add", "remove", "list"].includes(action?.toLowerCase())) {
      // Show help
      return {
        embeds: [
          {
            color: 0x3498db,
            title: "📋 Anti-Nuke Whitelist",
            description: "Manage users and roles exempt from anti-nuke detection.",
            fields: [
              { name: "Add User", value: "`/mod antinuke whitelist add user:@user`", inline: false },
              { name: "Add Role", value: "`/mod antinuke whitelist add role:@role`", inline: false },
              { name: "Remove User", value: "`/mod antinuke whitelist remove user:@user`", inline: false },
              { name: "View List", value: "`/mod antinuke whitelist list`", inline: false },
            ],
          },
        ],
      };
    }

    const settings = await this.database.getAntinukeSettings(this.guild.id);

    if (action.toLowerCase() === "list") {
      const users =
        settings.whitelisted_users.length > 0 ? settings.whitelisted_users.map((id) => `<@${id}>`).join("\n") : "None";
      const roles =
        settings.whitelisted_roles.length > 0 ? settings.whitelisted_roles.map((id) => `<@&${id}>`).join("\n") : "None";

      this.success = true;
      return {
        embeds: [
          {
            color: 0x3498db,
            title: "📋 Anti-Nuke Whitelist",
            fields: [
              { name: "Whitelisted Users", value: users, inline: true },
              { name: "Whitelisted Roles", value: roles, inline: true },
            ],
          },
        ],
      };
    }

    if (!user && !role) {
      return "❌ Please specify a user or role to add/remove.";
    }

    if (action.toLowerCase() === "add") {
      if (user) {
        const userId = typeof user === "string" ? user : user.id;
        if (settings.whitelisted_users.includes(userId)) {
          return "⚠️ That user is already whitelisted.";
        }
        await this.database.addToAntinukeWhitelist(this.guild.id, "users", userId);
        this.success = true;
        return `✅ Added <@${userId}> to anti-nuke whitelist.`;
      }
      if (role) {
        const roleId = typeof role === "string" ? role : role.id;
        if (settings.whitelisted_roles.includes(roleId)) {
          return "⚠️ That role is already whitelisted.";
        }
        await this.database.addToAntinukeWhitelist(this.guild.id, "roles", roleId);
        this.success = true;
        return `✅ Added <@&${roleId}> to anti-nuke whitelist.`;
      }
    }

    if (action.toLowerCase() === "remove") {
      if (user) {
        const userId = typeof user === "string" ? user : user.id;
        if (!settings.whitelisted_users.includes(userId)) {
          return "⚠️ That user is not whitelisted.";
        }
        await this.database.removeFromAntinukeWhitelist(this.guild.id, "users", userId);
        this.success = true;
        return `✅ Removed <@${userId}> from anti-nuke whitelist.`;
      }
      if (role) {
        const roleId = typeof role === "string" ? role : role.id;
        if (!settings.whitelisted_roles.includes(roleId)) {
          return "⚠️ That role is not whitelisted.";
        }
        await this.database.removeFromAntinukeWhitelist(this.guild.id, "roles", roleId);
        this.success = true;
        return `✅ Removed <@&${roleId}> from anti-nuke whitelist.`;
      }
    }

    return "❌ Invalid action. Use `add`, `remove`, or `list`.";
  }

  static flags = [
    {
      name: "action",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Action to perform",
      choices: [
        { name: "Add", value: "add" },
        { name: "Remove", value: "remove" },
        { name: "List", value: "list" },
      ],
      required: true,
    },
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "User to add/remove from whitelist",
    },
    {
      name: "role",
      type: Constants.ApplicationCommandOptionTypes.ROLE,
      description: "Role to add/remove from whitelist",
    },
  ];

  static description = "Manage anti-nuke whitelist (exempt users/roles)";
  static aliases = ["exempt", "bypass"];
  static dbRequired = true;
}

export default AntinukeWhitelistCommand;
