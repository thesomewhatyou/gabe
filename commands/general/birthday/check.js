import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class CheckBirthdayCommand extends Command {
    async run() {
        this.success = false;

        if (!this.guild) return "❌ This command can only be used in a server!";
        if (!this.database) return "❌ Database is not configured.";

        const rawInput = this.getOptionUser("user") ?? this.args[0];
        const user = rawInput
            ? typeof rawInput === "string"
                ? await this.client.rest.users.get(rawInput.replace(/[<@!>]/g, "")).catch(() => null)
                : rawInput
            : this.author;

        if (!user) return "❌ User not found.";

        const birthday = await this.database.getBirthday(this.guild.id, user.id);
        if (!birthday) {
            const isSelf = user.id === this.author.id;
            this.success = true;
            return isSelf
                ? "🎂 You haven't set your birthday yet! Use `/birthday set` to add it."
                : `🎂 ${user.username} hasn't set their birthday yet.`;
        }

        const monthNames = ["", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        let response = `🎂 **${user.id === this.author.id ? "Your" : `${user.username}'s`} Birthday**\n\n`;
        response += `📅 **${monthNames[birthday.birth_month]} ${birthday.birth_day}**`;

        if (birthday.birth_year) {
            const now = new Date();
            let age = now.getFullYear() - birthday.birth_year;
            // Check if birthday hasn't occurred yet this year
            if (now.getMonth() + 1 < birthday.birth_month ||
                (now.getMonth() + 1 === birthday.birth_month && now.getDate() < birthday.birth_day)) {
                age--;
            }
            response += `\n🎈 Age: **${age}**`;
        }

        // Calculate days until birthday
        const now = new Date();
        const thisYear = now.getFullYear();
        let nextBday = new Date(thisYear, birthday.birth_month - 1, birthday.birth_day);
        if (nextBday < now) {
            nextBday = new Date(thisYear + 1, birthday.birth_month - 1, birthday.birth_day);
        }
        const daysUntil = Math.ceil((nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil === 0) {
            response += `\n🎉 **It's their birthday today!**`;
        } else if (daysUntil === 1) {
            response += `\n⏰ Birthday is **tomorrow**!`;
        } else {
            response += `\n⏰ **${daysUntil}** days until birthday`;
        }

        this.success = true;
        return response;
    }

    static flags = [
        {
            name: "user",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "The user to check (defaults to yourself)",
            required: false,
        },
    ];

    static description = "Check a user's birthday";
    static aliases = ["view", "show"];
    static dbRequired = true;
}

export default CheckBirthdayCommand;
