import Command from "#cmd-classes/command.js";

class UpcomingBirthdaysCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    const upcoming = await this.database.getUpcomingBirthdays(this.guild.id, 30);

    if (upcoming.length === 0) {
      this.success = true;
      return "📅 No upcoming birthdays in the next 30 days.\n\nSet yours with `/birthday set`!";
    }

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();

    let response = "🎂 **Upcoming Birthdays** (next 30 days)\n\n";

    for (const bday of upcoming) {
      const thisYear = now.getFullYear();
      let nextBday = new Date(thisYear, bday.birth_month - 1, bday.birth_day);
      if (nextBday < now) {
        nextBday = new Date(thisYear + 1, bday.birth_month - 1, bday.birth_day);
      }
      const daysUntil = Math.ceil((nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const dateStr = `${monthNames[bday.birth_month]} ${bday.birth_day}`;
      const daysStr = daysUntil === 0 ? "🎉 **Today!**" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil} days`;

      response += `• <@${bday.user_id}> — ${dateStr} (${daysStr})\n`;
    }

    this.success = true;
    return response;
  }

  static description = "View upcoming birthdays";
  static aliases = ["soon", "next"];
  static dbRequired = true;
}

export default UpcomingBirthdaysCommand;
