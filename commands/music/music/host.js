import { Constants, User } from "oceanic.js";
import MusicCommand from "#cmd-classes/musicCommand.js";
import { parseDiscordSnowflakeArg } from "#utils/commandArgs.js";
import logger from "#utils/logger.js";
import { isOwner } from "#utils/owners.js";
import { players } from "#utils/soundplayer.js";

class MusicHostCommand extends MusicCommand {
  async run() {
    this.success = false;
    if (!this.guild) return this.getString("guildOnly");
    if (!this.member?.voiceState) return this.getString("sound.noVoiceState");
    if (!this.connection) return this.getString("sound.noConnection");
    if (!this.guild.voiceStates.get(this.client.user.id)?.channelID) return this.getString("sound.notInVoice");
    if (this.connection.host !== this.author.id && !isOwner(this.author?.id))
      return this.getString("commands.responses.host.notHost");

    const input = this.getOptionUser("user") ?? this.args.join(" ");
    if (input instanceof User || input?.trim()) {
      let user;
      if (input instanceof User) {
        user = input;
      } else if (this.type === "classic" && this.message) {
        const mentionedUser =
          this.message.mentions.users.length >= 1 ? this.message.mentions.users[0] : this.client.users.get(input);
        if (mentionedUser) {
          user = mentionedUser;
        } else {
          const id = parseDiscordSnowflakeArg(input);
          if (id) {
            user = await this.client.rest.users.get(id).catch(() => undefined);
          }
        }

        if (!user) {
          const userRegex = new RegExp(input.split(" ").join("|"), "i");
          user = this.client.users.find((element) => userRegex.test(element.username));
        }
      } else {
        user = this.client.users.get(input);
      }

      if (!user) return this.getString("commands.responses.host.noUser");
      if (user.bot) return "https://www.youtube.com/watch?v=rmQFcVR6vEs";
      const member =
        this.guild.members.get(user.id) ??
        (await this.client.rest.guilds.getMember(this.guild.id, user.id).catch((e) => {
          logger.warn(`Failed to get a member: ${e}`);
        }));
      if (!member) return this.getString("commands.responses.host.notMember");

      const object = this.connection;
      object.host = member.id;
      players.set(this.guild.id, object);
      this.success = true;
      return `\u{1F50A} ${this.getString("sound.newHost", { params: { member: member.mention } })}`;
    }

    const member = this.guild.members.get(this.connection.host);
    if (!member)
      return this.getString("commands.responses.host.currentHostId", { params: { id: this.connection.host } });
    this.success = true;
    return `\u{1F50A} ${this.getString("commands.responses.host.currentHost", { params: { member: member.username } })}`;
  }

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The user you want the new host to be",
      classic: true,
    },
  ];
  static description = "Gets or changes the host of the current voice session";
  static aliases = ["host", "sethost"];
}

export default MusicHostCommand;
