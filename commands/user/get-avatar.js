import { User } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class GetAvatarCommand extends Command {
  async run() {
    const target = this.interaction?.data.target;
    if (!(target instanceof User)) {
      throw Error("Target is not a user");
    }

    const avatarURL = target.avatarURL("png", 2048);
    const guildAvatarURL = this.guild && this.member ? target.avatarURL("png", 2048, this.guild.id) : null;

    const embed = {
      embeds: [
        {
          title: `${target.username}'s Avatar`,
          color: 0xff0000,
          image: {
            url: guildAvatarURL || avatarURL,
          },
          footer: {
            text: `User ID: ${target.id}`,
          },
        },
      ],
    };

    // Add field for server-specific avatar if it exists and is different
    if (guildAvatarURL && guildAvatarURL !== avatarURL) {
      embed.embeds[0].fields = [
        {
          name: "Global Avatar",
          value: `[Click here](${avatarURL})`,
          inline: true,
        },
      ];
    }

    return embed;
  }

  static description = "Get a user's avatar in high quality";
  static slashAllowed = false;
}

export default GetAvatarCommand;
