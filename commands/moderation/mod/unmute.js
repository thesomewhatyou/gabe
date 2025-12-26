import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class UnmuteCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
        if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

        if (!this.member.permissions.has(Constants.Permissions.MUTE_MEMBERS) && !isOwner(this.author?.id)) {
            return "❌ Gabe says: You don't have permission to unmute members. Nice try though!";
        }

        const user = this.options?.user ?? this.getOptionUser("user") ?? this.args[0];
        if (!user) return "❌ Gabe says: You gotta tell me who to unmute, genius.";

        const reason = this.options?.reason ?? this.getOptionString("reason") ?? this.args.slice(1).join(" ") ?? "Server unmuted";

        try {
            const targetUser = typeof user === "string" ? await this.client.rest.users.get(user).catch(() => null) : user;
            if (!targetUser) return "❌ Gabe says: I can't find that user. Are they even real?";

            const targetMember = this.guild.members.get(targetUser.id);
            if (!targetMember) return "❌ Gabe says: That user isn't in this server.";

            const myMember = this.guild.members.get(this.client.user.id);
            if (!myMember?.permissions.has(Constants.Permissions.MUTE_MEMBERS)) {
                return "❌ Gabe says: I don't have permission to unmute members. Give me more power!";
            }

            if (!targetMember.voiceState?.channelID) {
                return "❌ Gabe says: That user isn't in a voice channel.";
            }

            if (!targetMember.voiceState.mute) {
                return "❌ Gabe says: That user isn't muted. Nothing to unmute!";
            }

            await targetMember.edit({
                mute: false,
                reason: `${this.author.tag}: ${reason}`,
            });

            // Log the moderation action
            if (this.database) {
                await this.database.addModLog(this.guild.id, targetUser.id, this.author.id, "unmute", reason);
            }

            this.success = true;
            return `🔊 **${targetUser.tag}** has been server unmuted.\n*Reason:* ${reason}`;
        } catch (error) {
            return `❌ Gabe says: Something went wrong. ${error.message}`;
        }
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to server unmute",
            required: true,
        },
        {
            name: "reason",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Reason for the unmute",
        },
    ];

    static description = "Server unmute a user in voice channels";
    static aliases = ["voiceunmute", "serverunmute"];
}

export default UnmuteCommand;
