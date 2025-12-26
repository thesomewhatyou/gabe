import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class MassbanCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ Gabe says: This only works in servers, buddy.";
        if (!this.member) return "❌ Gabe says: I can't find you in this server. Weird.";

        const guild = this.guild;
        const member = this.member;

        if (!member.permissions.has(Constants.Permissions.BAN_MEMBERS) && !isOwner(this.author?.id)) {
            return "❌ Gabe says: You don't have permission to ban members. Nice try though!";
        }

        const usersInput = this.options?.users ?? this.getOptionString("users", true);
        if (!usersInput) return "❌ Gabe says: You gotta tell me who to ban, genius. Provide user IDs or mentions.";

        const reason = this.options?.reason ?? this.getOptionString("reason") ?? "Mass ban by Gabe";

        try {
            const myMember = guild.members.get(this.client.user.id);
            if (!myMember?.permissions.has(Constants.Permissions.BAN_MEMBERS)) {
                return "❌ Gabe says: I don't have permission to ban members. Give me more power!";
            }

            // Parse user IDs from input (handles mentions and raw IDs)
            const idRegex = /<@!?(\d+)>|(\d{17,20})/g;
            const matches = [...usersInput.matchAll(idRegex)];
            const userIds = [...new Set(matches.map((m) => m[1] || m[2]))]; // Remove duplicates

            if (userIds.length === 0) {
                return "❌ Gabe says: I couldn't find any valid user IDs in that mess. Try again!";
            }

            if (userIds.length > 25) {
                return "❌ Gabe says: Whoa there! Maximum 25 users per massban. You gave me " + userIds.length + ".";
            }

            // Filter out self, bot, and users with permissions
            const skipped = [];
            const toBan = [];

            for (const userId of userIds) {
                if (userId === this.author.id) {
                    skipped.push({ id: userId, reason: "That's you, dummy" });
                    continue;
                }

                if (userId === this.client.user.id) {
                    skipped.push({ id: userId, reason: "I'm not banning myself" });
                    continue;
                }

                const memberToBan = guild.members.get(userId);
                if (memberToBan) {
                    if (
                        memberToBan.permissions.has(Constants.Permissions.ADMINISTRATOR) ||
                        memberToBan.permissions.has(Constants.Permissions.BAN_MEMBERS)
                    ) {
                        skipped.push({ id: userId, reason: "Has mod/admin perms" });
                        continue;
                    }
                }

                toBan.push(userId);
            }

            if (toBan.length === 0) {
                const skipReasons = skipped.map((s) => `<@${s.id}>: ${s.reason}`).join("\n");
                return `❌ Gabe says: Couldn't ban anyone! All users were skipped:\n${skipReasons}`;
            }

            // Ban all valid users
            const banned = [];
            const failed = [];

            for (const userId of toBan) {
                try {
                    await guild.createBan(userId, {
                        deleteMessageSeconds: 0,
                        reason: `${this.author.tag} (massban): ${reason}`,
                    });

                    // Log the moderation action
                    if (this.database) {
                        await this.database.addModLog(guild.id, userId, this.author.id, "ban", `[MASSBAN] ${reason}`);
                    }

                    banned.push(userId);
                } catch (err) {
                    failed.push({ id: userId, error: err.message });
                }
            }

            this.success = true;

            let response = `🔨 **MASS BANNED!** ${banned.length} user(s) have been yeeted.\n*Reason:* ${reason}`;

            if (banned.length > 0 && banned.length <= 10) {
                response += `\n\n**Banned:** ${banned.map((id) => `<@${id}>`).join(", ")}`;
            } else if (banned.length > 10) {
                response += `\n\n**Banned:** ${banned.length} users`;
            }

            if (skipped.length > 0) {
                response += `\n\n**Skipped (${skipped.length}):** ${skipped.map((s) => `<@${s.id}>`).join(", ")}`;
            }

            if (failed.length > 0) {
                response += `\n\n**Failed (${failed.length}):** ${failed.map((f) => `<@${f.id}>`).join(", ")}`;
            }

            return response;
        } catch (error) {
            return `❌ Gabe says: Something went wrong. ${error.message}`;
        }
    }

    static flags = [
        {
            name: "users",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "Space-separated user IDs or mentions to ban (max 25)",
            required: true,
        },
        {
            name: "reason",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "The reason for the mass ban",
        },
    ];

    static description = "Ban multiple users at once (max 25)";
    static aliases = ["massyeet", "multibanp"];
}

export default MassbanCommand;
