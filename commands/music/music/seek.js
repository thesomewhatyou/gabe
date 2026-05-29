import { Constants } from "oceanic.js";
import MusicCommand from "#cmd-classes/musicCommand.js";

export function parseSeekPosition(pos) {
  const input = typeof pos === "number" ? pos.toString() : pos?.trim();
  if (!input) return NaN;
  if (!input.includes(":")) {
    const seconds = Number(input);
    return Number.isFinite(seconds) ? seconds : NaN;
  }

  const parts = input.split(":");
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return NaN;
  const times = parts.map((part) => Number(part));
  if (times.slice(1).some((part) => part > 59)) return NaN;
  return times.reduce((acc, time) => 60 * acc + time, 0);
}

class MusicSeekCommand extends MusicCommand {
  async run() {
    this.success = false;
    if (!this.guild) return this.getString("guildOnly");
    if (!this.member?.voiceState) return this.getString("sound.noVoiceState");
    if (!this.guild.voiceStates.get(this.client.user.id)?.channelID) return this.getString("sound.notInVoice");
    if (!this.connection) return this.getString("sound.noConnection");
    if (this.connection.host !== this.author.id) return this.getString("commands.responses.seek.notHost");
    const player = this.connection.player;
    if (!player || !player.track) return this.getString("sound.notPlaying");
    const track = await player.node.rest.decode(player.track);
    if (!track?.info.isSeekable) return this.getString("commands.responses.seek.notSeekable");
    const pos = this.getOptionString("position") ?? this.args[0];
    const seconds = parseSeekPosition(pos);
    if (Number.isNaN(seconds) || seconds * 1000 > track.info.length || seconds * 1000 < 0)
      return this.getString("commands.responses.seek.invalidPosition");
    player.seekTo(seconds * 1000);
    this.success = true;
    return `🔊 ${this.getString("commands.responses.seek.seeked", { params: { seconds: seconds.toString() } })}`;
  }

  static flags = [
    {
      name: "position",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Seek to this position",
      required: true,
      classic: true,
    },
  ];
  static description = "Seeks to a different position in the music";
  static aliases = ["seek", "pos"];
}

export default MusicSeekCommand;
