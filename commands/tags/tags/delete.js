import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { isOwner } from "#utils/owners.js";

class TagsDeleteCommand extends Command {
  async run() {
    if (!this.database) return this.getString("noDatabase");
    if (!this.guild) return this.getString("guildOnly");
    if (!this.permissions.has("EMBED_LINKS")) return this.getString("permissions.noEmbedLinks");
    const tagName = this.args[0] ?? this.getOptionString("name");
    if (!tagName) return this.getString("commands.responses.tags.noInput");
    const getResult = await this.database.getTag(this.guild.id, tagName);
    if (!getResult) return this.getString("commands.responses.tags.invalid");
    if (
      getResult.author !== this.author.id &&
      !this.memberPermissions.has("MANAGE_MESSAGES") &&
      !isOwner(this.author?.id)
    )
      return this.getString("commands.responses.tags.notOwner");
    await this.database.removeTag(tagName, this.guild);
    this.success = true;
    return this.getString("commands.responses.tags.deleted", {
      params: {
        name: tagName,
      },
    });
  }

  static flags = [
    {
      name: "name",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The name of the tag",
      required: true,
      classic: true,
    },
  ];

  static description = "Deletes a tag";
  static directAllowed = false;
  static userAllowed = false;
  static dbRequired = true;
}

export default TagsDeleteCommand;
