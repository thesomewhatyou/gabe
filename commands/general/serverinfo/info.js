import process from "node:process";
import Command from "#cmd-classes/command.js";
import { commands as slashCommands, locales, messageCommands, userCommands } from "#utils/collections.js";
import logger from "#utils/logger.js";
import { getServers } from "#utils/misc.js";
import { getOwners } from "#utils/owners.js";
import packageJson from "../../../package.json" with { type: "json" };

class InfoCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }

    await this.acknowledge();

    const owners = getOwners();
    let owner;
    if (owners.length !== 0) {
      owner = this.client.users.get(owners[0]);
      if (!owner) {
        try {
          owner = await this.client.rest.users.get(owners[0]);
        } catch (error) {
          logger.warn(`Failed to fetch owner information: ${error}`);
        }
      }
    }

    let prefix = process.env.PREFIX ?? "&";
    if (this.guild && this.database) {
      try {
        const guildSettings = await this.database.getGuild(this.guild.id);
        if (guildSettings?.prefix) prefix = guildSettings.prefix;
      } catch (error) {
        logger.warn(`Failed to fetch guild prefix for info command: ${error}`);
      }
    }

    let servers;
    try {
      servers = await getServers(this.client);
    } catch (error) {
      logger.warn(`Failed to fetch total server count: ${error}`);
    }

    let numberFormatter;
    try {
      numberFormatter = new Intl.NumberFormat(this.locale);
    } catch {
      numberFormatter = null;
    }

    const formatNumber = (value) => (numberFormatter ? numberFormatter.format(value) : value.toString());

    const serverDisplay =
      typeof servers === "number"
        ? formatNumber(servers)
        : this.getString("commands.responses.info.processOnly", {
            params: { count: formatNumber(this.client.guilds.size) },
          });

    const statsLines = [
      `• **${this.getString("commands.responses.info.totalServers")}** ${serverDisplay}`,
      `• **${this.getString("commands.responses.info.shardCount")}** ${formatNumber(this.client.shards.size)}`,
      `• **${this.getString("commands.responses.info.commandTotal")}** ${formatNumber(slashCommands.size)}`,
      `• **${this.getString("commands.responses.info.contextTotal")}** ${formatNumber(messageCommands.size + userCommands.size)}`,
      `• **${this.getString("commands.responses.info.languageTotal")}** ${formatNumber(locales.size)}`,
    ];

    const resourcesLines = [
      `**${this.getString("commands.responses.info.officialServer")}** ${this.getString("commands.responses.info.noOfficialServer")}`,
      `**${this.getString("commands.responses.info.sourceCode")}** [${this.getString("commands.responses.info.clickHere")}](https://github.com/thesomewhatyou/gabe)`,
      `**${this.getString("commands.responses.info.translate")}** ${this.getString("commands.responses.info.noTranslations")}`,
      `**${this.getString("commands.responses.info.privacyPolicy")}** ${this.getString("commands.responses.info.seePrivacyMd")}`,
      `**${this.getString("commands.responses.info.mastodonLabel")}** ${this.getString("commands.responses.info.noSocials")}`,
      `**${this.getString("commands.responses.info.blueskyLabel")}** ${this.getString("commands.responses.info.noSocials")}`,
    ];

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
              value: `v${packageJson.version}${
                process.env.NODE_ENV === "development" ? `-dev (${process.env.GIT_REV})` : ""
              }`,
            },
            {
              name: `📊 ${this.getString("commands.responses.info.keyStatsTitle")}`,
              value: statsLines.join("\n"),
            },
            {
              name: `🔧 ${this.getString("commands.responses.info.prefixTitle")}`,
              value: this.getString("commands.responses.info.prefixValue", { params: { prefix } }),
            },
            {
              name: `🧠 ${this.getString("commands.responses.info.featuresTitle")}`,
              value: this.getString("commands.responses.info.featuresList"),
            },
            {
              name: `📝 ${this.getString("commands.responses.info.creditsHeader")}`,
              value: `${this.getString("commands.responses.info.credits")}\n*Themed by yours truly, Gabriel Piss*`,
            },
            {
              name: `🌐 ${this.getString("commands.responses.info.resourcesTitle")}`,
              value: resourcesLines.join("\n"),
            },
          ],
        },
      ],
    };
  }

  static description = "Gets detailed info, stats, and credits about Gabe";
  static aliases = ["botinfo", "credits", "about"];
}

export default InfoCommand;
