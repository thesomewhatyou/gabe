import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeSettingsCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ This only works in servers.";
        if (!this.member) return "❌ I can't find you in this server.";
        if (!this.database) return "❌ Database not available.";

        // Check permissions - only admins or bot owners
        if (!this.member.permissions.has(Constants.Permissions.ADMINISTRATOR) && !isOwner(this.author?.id)) {
            return "❌ You need Administrator permissions to manage anti-nuke settings.";
        }

        const threshold = this.options?.threshold ?? this.getOptionInteger("threshold");
        const timeWindow = this.options?.time_window ?? this.getOptionInteger("time_window");
        const logChannel = this.options?.log_channel ?? this.getOptionChannel("log_channel");

        if (threshold === undefined && timeWindow === undefined && !logChannel) {
            // Show current settings if no options provided
            const settings = await this.database.getAntinukeSettings(this.guild.id);
            return {
                embeds: [
                    {
                        color: 0x3498db,
                        title: "⚙️ Anti-Nuke Settings",
                        description: "Use the options below to modify settings:",
                        fields: [
                            { name: "Current Threshold", value: `${settings.threshold} actions`, inline: true },
                            { name: "Current Time Window", value: `${settings.time_window} seconds`, inline: true },
                            { name: "Log Channel", value: settings.log_channel_id ? `<#${settings.log_channel_id}>` : "Not set", inline: true },
                        ],
                        footer: { text: "Example: /mod antinuke settings threshold:15 time_window:5" },
                    },
                ],
            };
        }

        const settings = await this.database.getAntinukeSettings(this.guild.id);
        const changes = [];

        if (threshold !== undefined) {
            if (threshold < 1 || threshold > 100) {
                return "❌ Threshold must be between 1 and 100.";
            }
            settings.threshold = threshold;
            changes.push(`Threshold: **${threshold} actions**`);
        }

        if (timeWindow !== undefined) {
            if (timeWindow < 1 || timeWindow > 60) {
                return "❌ Time window must be between 1 and 60 seconds.";
            }
            settings.time_window = timeWindow;
            changes.push(`Time Window: **${timeWindow} seconds**`);
        }

        if (logChannel) {
            settings.log_channel_id = logChannel.id ?? logChannel;
            changes.push(`Log Channel: <#${settings.log_channel_id}>`);
        }

        await this.database.setAntinukeSettings(settings);

        this.success = true;
        return {
            embeds: [
                {
                    color: 0x2ecc71,
                    title: "⚙️ Anti-Nuke Settings Updated",
                    description: changes.join("\n"),
                },
            ],
        };
    }

    static flags = [
        {
            name: "threshold",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Number of actions to trigger detection (1-100)",
            minValue: 1,
            maxValue: 100,
        },
        {
            name: "time_window",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Time window in seconds (1-60)",
            minValue: 1,
            maxValue: 60,
        },
        {
            name: "log_channel",
            type: Constants.ApplicationCommandOptionTypes.CHANNEL,
            description: "Channel to log anti-nuke alerts",
        },
    ];

    static description = "Configure anti-nuke protection thresholds";
    static aliases = ["set", "configure"];
    static dbRequired = true;
}

export default AntinukeSettingsCommand;
