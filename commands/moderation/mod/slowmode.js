import { Constants, TextChannel } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class SlowmodeCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
        if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

        if (!this.member.permissions.has(Constants.Permissions.MANAGE_CHANNELS) && !isOwner(this.author?.id)) {
            return "❌ Gabe says: You don't have permission to manage channels. Nice try though!";
        }

        const seconds = this.options?.seconds ?? this.getOptionInteger("seconds") ?? this.args[0];
        if (seconds === undefined || seconds === null) {
            return "❌ Gabe says: You gotta tell me how many seconds of slowmode, genius.";
        }

        const secondsNum = typeof seconds === "string" ? Number.parseInt(seconds) : seconds;

        if (Number.isNaN(secondsNum) || secondsNum < 0 || secondsNum > 21600) {
            return "❌ Gabe says: Slowmode must be between 0 and 21600 seconds (6 hours).";
        }

        try {
            const channel = this.channel;

            if (!(channel instanceof TextChannel)) {
                return "❌ Gabe says: This command only works in text channels.";
            }

            const myPerms = this.permissions;
            if (!myPerms.has(Constants.Permissions.MANAGE_CHANNELS)) {
                return "❌ Gabe says: I don't have permission to manage this channel. Give me more power!";
            }

            await channel.edit({ rateLimitPerUser: secondsNum });

            this.success = true;
            if (secondsNum === 0) {
                return "⏱️ Slowmode has been disabled. Chat freely, nerds!";
            }
            return `⏱️ Slowmode set to **${secondsNum} seconds**. Try not to spam!`;
        } catch (error) {
            return `❌ Gabe says: Something went wrong. ${error.message}`;
        }
    }

    static flags = [
        {
            name: "seconds",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            description: "Slowmode duration in seconds (0 to disable, max 21600)",
            required: true,
            minValue: 0,
            maxValue: 21600,
        },
    ];

    static description = "Set channel slowmode";
    static aliases = ["slow", "ratelimit"];
}

export default SlowmodeCommand;
