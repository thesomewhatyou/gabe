import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class SetBirthdayCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    const month = this.getOptionInteger("month") ?? parseInt(this.args[0]);
    const day = this.getOptionInteger("day") ?? parseInt(this.args[1]);
    const year = this.getOptionInteger("year") ?? (this.args[2] ? parseInt(this.args[2]) : undefined);

    if (!month || !day || isNaN(month) || isNaN(day)) {
      return "❌ Please provide a valid month and day. Example: `/birthday set 12 25`";
    }

    if (month < 1 || month > 12) {
      return "❌ Month must be between 1 and 12.";
    }

    const daysInMonth = new Date(2000, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return `❌ Day must be between 1 and ${daysInMonth} for month ${month}.`;
    }

    if (year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) {
        return `❌ Year must be between 1900 and ${currentYear}.`;
      }
    }

    await this.database.setBirthday(this.guild.id, this.author.id, month, day, year);

    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.success = true;
    return `🎂 Your birthday has been set to **${monthNames[month]} ${day}**${year ? `, ${year}` : ""}!`;
  }

  static flags = [
    {
      name: "month",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Birth month (1-12)",
      required: true,
      minValue: 1,
      maxValue: 12,
    },
    {
      name: "day",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Birth day (1-31)",
      required: true,
      minValue: 1,
      maxValue: 31,
    },
    {
      name: "year",
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      description: "Birth year (optional, for age display)",
      required: false,
    },
  ];

  static description = "Set your birthday";
  static dbRequired = true;
}

export default SetBirthdayCommand;
