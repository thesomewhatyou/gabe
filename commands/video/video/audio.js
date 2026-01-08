import ImageCommand from "#cmd-classes/imageCommand.js";

class VideoAudioCommand extends ImageCommand {
  static description = "Extract audio from a video as MP3";
  static aliases = ["vaudio", "videoaudio", "extractaudio", "tomp3"];

  static requiresImage = true;
  static requiresVideo = true;
  static noImage = "You need to provide a video to extract audio from!";
  static command = "videoaudio";
}

export default VideoAudioCommand;
