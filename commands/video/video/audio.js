import ImageCommand from "#cmd-classes/imageCommand.js";

class AudioCommand extends ImageCommand {
  static description = "Extract the audio track from a video as MP3";
  static aliases = ["extractaudio", "tomp3", "mp3"];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to extract audio from!";
  static command = "videoaudio";
}

export default AudioCommand;
