import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeEnableCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ This only works in servers.";
        if (!this.member) return "❌ I can't find you in this server.";
        if (!this.database) return "❌ Database not available.";

        // Check permissions - only admins or bot owners
        if (!this.member.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
            return "❌ You need Administrator permissions to manage anti-nuke settings.";
        }

        const settings = await this.database.getAntinukeSettings(this.guild.id);

        if (settings.enabled) {
            return "⚠️ Anti-nuke protection is already enabled!";
        }

        settings.enabled = true;
        await this.database.setAntinukeSettings(settings);

        this.success = true;
        return {
            embeds: [
                {
                    color: 0x2ecc71,
                    title: "🛡️ Anti-Nuke Protection Enabled",
                    description: "Gabe is now monitoring for mass destructive actions.",
                    fields: [
                        { name: "Threshold", value: `${settings.threshold} actions in ${settings.time_window} seconds`, inline: true },
                        { name: "Actions Monitored", value: "Bans, Kicks, Channel Deletions, Role Deletions", inline: false },
                    ],
                    footer: { text: "Use /mod antinuke settings to adjust thresholds" },
                },
            ],
        };
    }

    static description = "Enable anti-nuke protection";
    static aliases = ["on", "activate"];
    static dbRequired = true;
}

export default AntinukeEnableCommand;
