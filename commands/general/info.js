import process from "node:process";
import Command from "#cmd-classes/command.js";
import { getServers } from "#utils/misc.js";
import packageJson from "../../package.json" with { type: "json" };

class InfoCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }
    const owners = process.env.OWNER?.split(",") ?? [];
    let owner;
    if (owners.length !== 0) {
      owner = this.client.users.get(owners[0]);
      if (!owner) owner = await this.client.rest.users.get(owners[0]);
    }
    const servers = await getServers(this.client);
    await this.acknowledge();
    return {
      embeds: [
        {
          color: 0xff0000,
          author: {
            name: "Gabe - Your Pal, Enemy, or Both",
            iconURL: this.client.user.avatarURL(),
          },
          description: `🤖 **Who's Gabe?** A multifunctional Discord bot with personality!\n${this.getString("managedBy", { params: { owner: owner?.username ?? "N/A" } })}`,
          fields: [
            {
              name: `ℹ️ ${this.getString("commands.responses.info.version")}`,
              value: `v${packageJson.version}${process.env.NODE_ENV === "development" ? `-dev (${process.env.GIT_REV})` : ""}`,
            },
            {
              name: `📝 ${this.getString("commands.responses.info.creditsHeader")}`,
              value: this.getString("commands.responses.info.credits") + "\n*Themed by Gabriel Piss*",
            },
            {
              name: `💬 ${this.getString("commands.responses.info.totalServers")}`,
              value: servers
                ? servers.toString()
                : this.getString("commands.responses.info.processOnly", {
                    params: { count: this.client.guilds.size.toString() },
                  }),
            },
            {
              name: `✅ ${this.getString("commands.responses.info.officialServer")}`,
              value: this.getString("commands.responses.info.noOfficialServer"),
            },
            {
              name: `💻 ${this.getString("commands.responses.info.sourceCode")}`,
              value: `[${this.getString("commands.responses.info.clickHere")}](https://github.com/gabrielpiss/gabe)`,
            },
            {
              name: `🌐 ${this.getString("commands.responses.info.translate")}`,
              value: this.getString("commands.responses.info.noTranslations"),
            },
            {
              name: `🛡️ ${this.getString("commands.responses.info.privacyPolicy")}`,
              value: this.getString("commands.responses.info.seePrivacyMd"),
            },
            {
              name: "🐘 Mastodon:",
              value: this.getString("commands.responses.info.noSocials"),
              inline: true,
            },
            {
              name: "🦋 Bluesky:",
              value: this.getString("commands.responses.info.noSocials"),
              inline: true,
            },
          ],
        },
      ],
    };
  }

  static description = "Gets some info and credits about Gabe";
  static aliases = ["botinfo", "credits", "about"];
}

export default InfoCommand;
