import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class ChannelCommand extends Command {
  async run() {
    if (!this.guild || !this.database) {
      this.success = false;
      return this.getString("commands.responses.starboard.serverOnly");
    }

    if (!this.member?.permissions.has("MANAGE_GUILD")) {
      this.success = false;
      return this.getString("commands.responses.starboard.manageGuildOnly");
    }

    const channel = this.getOption("channel", Constants.ApplicationCommandOptionTypes.CHANNEL, true);
    if (!channel || channel.guildID !== this.guild.id || !("permissionsOf" in channel)) {
      this.success = false;
      return this.getString("commands.responses.starboard.invalidChannel");
    }

    if (!channel.permissionsOf(this.client.user.id).has("SEND_MESSAGES")) {
      this.success = false;
      return this.getString("commands.responses.starboard.cannotSend");
    }

    const settings = await this.database.getStarboardSettings(this.guild.id);
    settings.channel_id = channel.id;
    settings.enabled = true;
    await this.database.setStarboardSettings(settings);

    return this.getString("commands.responses.starboard.channelSet", {
      params: { channel: `<#${channel.id}>` },
    });
  }

  static description = "Set the starboard channel";
  static flags = [
    {
      name: "channel",
      description: "Channel to post starboard messages",
      type: Constants.ApplicationCommandOptionTypes.CHANNEL,
      required: true,
      channelTypes: [Constants.ChannelTypes.GUILD_TEXT, Constants.ChannelTypes.GUILD_ANNOUNCEMENT],
      classic: false,
    },
  ];
  static adminOnly = true;
  static dbRequired = true;
}

export default ChannelCommand;
