import Command from "#cmd-classes/command.js";

class BirthdayCommand extends Command {
  async run() {
    if (!this.guild) {
      this.success = false;
      return "❌ This command can only be used in a server!";
    }

    return `🎂 **Birthday System**

Use one of the following:
• \`/birthday set <month> <day> [year]\` - Set your birthday
• \`/birthday remove\` - Remove your birthday
• \`/birthday check [@user]\` - Check a birthday
• \`/birthday upcoming\` - See upcoming birthdays
• \`/birthday setup\` - Admin: configure announcements`;
  }

  static description = "Birthday tracking system";
  static aliases = ["bday"];
  static dbRequired = true;
}

export default BirthdayCommand;
