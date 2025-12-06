import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class EmojiCommand extends Command {
  async run() {
    if (!this.guild || !this.database) {
      this.success = false;
      return this.getString("commands.responses.starboard.serverOnly");
    }

    if (!this.member?.permissions.has("MANAGE_GUILD")) {
      this.success = false;
      return this.getString("commands.responses.starboard.manageGuildOnly");
    }

    const emojiArg = this.getOption("emoji", Constants.ApplicationCommandOptionTypes.STRING, true);
    if (!emojiArg) {
      this.success = false;
      return this.getString("commands.responses.starboard.invalidEmoji");
    }

    const settings = await this.database.getStarboardSettings(this.guild.id);
    settings.emoji = emojiArg;
    await this.database.setStarboardSettings(settings);

    return this.getString("commands.responses.starboard.emojiSet", { params: { emoji: emojiArg } });
  }

  static description = "Set the starboard emoji";
  static flags = [
    {
      name: "emoji",
      description: "Emoji to trigger the starboard",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      required: true,
      classic: true,
    },
  ];
  static dbRequired = true;
}

export default EmojiCommand;
