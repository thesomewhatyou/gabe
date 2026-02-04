import Command from "#cmd-classes/command.js";

class RemoveBirthdayCommand extends Command {
  async run() {
    this.success = false;

    if (!this.guild) return "❌ This command can only be used in a server!";
    if (!this.database) return "❌ Database is not configured.";

    const existing = await this.database.getBirthday(this.guild.id, this.author.id);
    if (!existing) {
      return "❌ You don't have a birthday set.";
    }

    await this.database.removeBirthday(this.guild.id, this.author.id);

    this.success = true;
    return "✅ Your birthday has been removed.";
  }

  static description = "Remove your birthday";
  static aliases = ["delete", "clear"];
  static dbRequired = true;
}

export default RemoveBirthdayCommand;
