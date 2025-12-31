import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeStatusCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ This only works in servers.";
        if (!this.member) return "❌ I can't find you in this server.";
        if (!this.database) return "❌ Database not available.";

        // Check permissions - only admins or bot owners
        if (!this.member.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
            return "❌ You need Administrator permissions to view anti-nuke settings.";
        }

        const settings = await this.database.getAntinukeSettings(this.guild.id);

        const whitelistedUsers = settings.whitelisted_users.length > 0
            ? settings.whitelisted_users.map((id) => `<@${id}>`).join(", ")
            : "None";

        const whitelistedRoles = settings.whitelisted_roles.length > 0
            ? settings.whitelisted_roles.map((id) => `<@&${id}>`).join(", ")
            : "None";

        const trustedUser = settings.trusted_user
            ? settings.trusted_user.startsWith("<") ? settings.trusted_user : `<@${settings.trusted_user}>`
            : "Not configured";

        const logChannel = settings.log_channel_id
            ? `<#${settings.log_channel_id}>`
            : "Not configured";

        this.success = true;
        return {
            embeds: [
                {
                    color: settings.enabled ? 0x2ecc71 : 0xe74c3c,
                    title: `🛡️ Anti-Nuke Status: ${settings.enabled ? "ENABLED" : "DISABLED"}`,
                    fields: [
                        { name: "Detection Threshold", value: `${settings.threshold} actions`, inline: true },
                        { name: "Time Window", value: `${settings.time_window} seconds`, inline: true },
                        { name: "Log Channel", value: logChannel, inline: true },
                        { name: "Trusted User (Fallback)", value: trustedUser, inline: false },
                        { name: "Whitelisted Users", value: whitelistedUsers, inline: false },
                        { name: "Whitelisted Roles", value: whitelistedRoles, inline: false },
                    ],
                    footer: { text: "Use /mod antinuke settings to modify configuration" },
                },
            ],
        };
    }

    static description = "View anti-nuke protection status and settings";
    static aliases = ["info", "config"];
    static dbRequired = true;
}

export default AntinukeStatusCommand;
