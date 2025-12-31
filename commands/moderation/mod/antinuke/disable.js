import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeDisableCommand extends Command {
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

        if (!settings.enabled) {
            return "⚠️ Anti-nuke protection is already disabled.";
        }

        settings.enabled = false;
        await this.database.setAntinukeSettings(settings);

        this.success = true;
        return {
            embeds: [
                {
                    color: 0xe74c3c,
                    title: "🛡️ Anti-Nuke Protection Disabled",
                    description: "Anti-nuke monitoring has been turned off.\n\n⚠️ Your server is no longer protected from mass destructive actions.",
                },
            ],
        };
    }

    static description = "Disable anti-nuke protection";
    static aliases = ["off", "deactivate"];
    static dbRequired = true;
}

export default AntinukeDisableCommand;
