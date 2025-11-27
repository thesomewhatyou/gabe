import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.ts";

class AvatarCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return "❌ I need permission to embed links to show avatars!";
    }

    const targetUser = this.getOptionUser("user") ?? this.author;
    const targetMember = this.guild?.members.get(targetUser.id);

    const globalAvatar = targetUser.avatarURL("png", 4096);
    const serverAvatar = targetMember?.avatarURL("png", 4096);

    const hasServerAvatar = serverAvatar && serverAvatar !== globalAvatar;

    const formatLinks = (url) => {
      if (!url) return "N/A";
      const base = url.split("?")[0];
      const formats = ["png", "jpg", "webp"];
      if (url.includes("/a_")) formats.push("gif");

      return formats
        .map((fmt) => `[${fmt.toUpperCase()}](${base.replace(/\.(png|jpg|webp|gif)$/, `.${fmt}`)}?size=4096)`)
        .join(" • ");
    };

    const fields = [
      {
        name: "🌐 Global Avatar",
        value: formatLinks(globalAvatar),
        inline: false,
      },
    ];

    if (hasServerAvatar) {
      fields.push({
        name: "🏠 Server Avatar",
        value: formatLinks(serverAvatar),
        inline: false,
      });
    }

    const displayAvatar = hasServerAvatar ? serverAvatar : globalAvatar;

    const embed = {
      color: 0x5865f2,
      author: {
        name: `${targetUser.globalName ?? targetUser.username}'s Avatar`,
        iconURL: globalAvatar,
      },
      image: {
        url: displayAvatar,
      },
      fields,
      footer: {
        text: hasServerAvatar
          ? "Showing server avatar • Use the links above for global avatar"
          : `Requested by ${this.author.username}`,
        iconURL: this.author.avatarURL(),
      },
      timestamp: new Date().toISOString(),
    };

    return { embeds: [embed] };
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user to get the avatar of (defaults to yourself)",
      classic: true,
    },
  ];

  static description = "Get a user's avatar in full resolution";
  static aliases = ["av", "pfp", "pic"];
}

export default AvatarCommand;
