import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class AntinukeTrustedUserCommand extends Command {
    async run() {
        this.success = false;
        if (!this.guild) return "❌ This only works in servers.";
        if (!this.member) return "❌ I can't find you in this server.";
        if (!this.database) return "❌ Database not available.";

        // Only owner can set trusted user (this is the fallback admin)
        if (this.author.id !== this.guild.ownerID && !isOwner(this.author?.id)) {
            return "❌ Only the server owner can configure the trusted user (fallback admin).";
        }

        const user = this.options?.user ?? this.getOptionUser("user") ?? this.args[0];

        if (!user) {
            // Show current trusted user
            const settings = await this.database.getAntinukeSettings(this.guild.id);
            if (settings.trusted_user) {
                const trustedDisplay = settings.trusted_user.startsWith("<")
                    ? settings.trusted_user
                    : `<@${settings.trusted_user}>`;
                return {
                    embeds: [
                        {
                            color: 0x3498db,
                            title: "🔐 Trusted User (Fallback Admin)",
                            description: `Current trusted user: ${trustedDisplay}\n\nThis user will receive Administrator permissions if the owner's account is compromised.`,
                            footer: { text: "Use /mod antinuke trusteduser remove to clear" },
                        },
                    ],
                };
            } else {
                return {
                    embeds: [
                        {
                            color: 0xf39c12,
                            title: "🔐 No Trusted User Configured",
                            description: "Set a trusted user who will receive emergency admin permissions if your account is compromised.\n\n**Usage:** `/mod antinuke trusteduser @user`",
                        },
                    ],
                };
            }
        }

        // Handle "remove" subcommand
        if (typeof user === "string" && user.toLowerCase() === "remove") {
            const settings = await this.database.getAntinukeSettings(this.guild.id);
            settings.trusted_user = null;
            await this.database.setAntinukeSettings(settings);

            this.success = true;
            return "✅ Trusted user has been removed.";
        }

        // Set the trusted user
        const userId = typeof user === "string" ? user.replace(/^<@!?/, "").replace(/>$/, "") : user.id;

        // Verify user exists
        try {
            await this.client.rest.users.get(userId);
        } catch {
            return "❌ Could not find that user. Please provide a valid user ID or mention.";
        }

        // Can't set yourself as trusted user
        if (userId === this.author.id) {
            return "❌ You can't set yourself as the trusted user. Choose someone you trust to act as fallback.";
        }

        const settings = await this.database.getAntinukeSettings(this.guild.id);
        settings.trusted_user = userId;
        await this.database.setAntinukeSettings(settings);

        this.success = true;
        return {
            embeds: [
                {
                    color: 0x2ecc71,
                    title: "🔐 Trusted User Set",
                    description: `<@${userId}> is now your trusted fallback admin.\n\nIf your account shows signs of compromise, they will automatically receive Administrator permissions to protect the server.`,
                },
            ],
        };
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "User to set as trusted fallback admin",
        },
    ];

    static description = "Set a trusted user as fallback admin in case of owner compromise";
    static aliases = ["trusted", "fallback"];
    static dbRequired = true;
}

export default AntinukeTrustedUserCommand;
