/**
 * FFmpeg Video Processing Module for Gabe Discord Bot
 *
 * This module provides video manipulation capabilities using FFmpeg CLI.
 * All operations write to temporary files, process with ffmpeg, and return buffers.
 *
 * Operations: speed, reverse, caption, togif, trim, meme, stitch, audio extraction
 */

#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <random>
#include <sstream>
#include <string>

#include "common.h"

using namespace std;
namespace fs = std::filesystem;

// Helper: Generate unique temporary filename
static string makeTempPath(const string &ext) {
  auto now = chrono::high_resolution_clock::now();
  auto ns = chrono::duration_cast<chrono::nanoseconds>(now.time_since_epoch()).count();
  random_device rd;
  mt19937 gen(rd());
  uniform_int_distribution<> dist(100000, 999999);

  ostringstream oss;
  oss << "/tmp/gabe_" << ns << "_" << dist(gen) << ext;
  return oss.str();
}

// Helper: Write buffer to file
static bool writeFile(const string &path, const char *data, size_t len) {
  ofstream out(path, ios::binary);
  if (!out) return false;
  out.write(data, static_cast<streamsize>(len));
  return out.good();
}

// Helper: Read file into malloc'd buffer, returns nullptr on failure
static char *readFile(const string &path, size_t &outSize) {
  ifstream in(path, ios::binary | ios::ate);
  if (!in) return nullptr;

  auto size = in.tellg();
  if (size <= 0) return nullptr;

  in.seekg(0, ios::beg);
  char *buf = static_cast<char *>(malloc(static_cast<size_t>(size)));
  if (!buf) return nullptr;

  in.read(buf, size);
  if (!in) {
    free(buf);
    return nullptr;
  }

  outSize = static_cast<size_t>(size);
  return buf;
}

// Helper: Remove temp file if it exists
static void removeTempFile(const string &path) {
  try {
    fs::remove(path);
  } catch (...) {
  }
}

// Helper: Escape text for FFmpeg drawtext filter
static string escapeDrawtext(const string &text) {
  string out;
  out.reserve(text.size() * 2);
  for (char c : text) {
    // Escape characters that have special meaning in drawtext
    if (c == '\'' || c == '\\' || c == ':' || c == '%') {
      out += '\\';
    }
    out += c;
  }
  return out;
}

// Helper: Run ffmpeg command and return success status
static bool runFfmpeg(const string &cmd) {
  string fullCmd = cmd + " 2>/dev/null";
  return system(fullCmd.c_str()) == 0;
}

// Helper: Build output map with buffer
static ArgumentMap makeOutput(char *buf, size_t size) {
  ArgumentMap out;
  out["buf"] = buf;
  out["size"] = size;
  return out;
}

// Helper: Build error output map
static ArgumentMap makeError(const string &msg) {
  ArgumentMap out;
  out["error"] = msg;
  return out;
}

/**
 * VideoSpeed - Adjust playback speed of video
 * Parameters: speed (float), slow (bool)
 */
ArgumentMap VideoSpeed(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                       ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  float speed = GetArgumentWithFallback<float>(arguments, "speed", 2.0f);
  bool slow = GetArgumentWithFallback<bool>(arguments, "slow", false);

  // Clamp speed
  if (speed < 0.25f) speed = 0.25f;
  if (speed > 4.0f) speed = 4.0f;

  float factor = slow ? (1.0f / speed) : speed;
  outType = type;

  string inPath = makeTempPath("." + type);
  string outPath = makeTempPath("." + type);

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  // Build ffmpeg command with video and audio speed adjustment
  ostringstream cmd;
  cmd << "ffmpeg -y -i \"" << inPath << "\" -filter_complex \"";

  // Video speed: setpts=PTS/factor
  cmd << "[0:v]setpts=" << (1.0f / factor) << "*PTS[v];";

  // Audio speed: atempo (limited to 0.5-2.0, chain for extremes)
  cmd << "[0:a]";
  float audioFactor = factor;
  while (audioFactor > 2.0f) {
    cmd << "atempo=2.0,";
    audioFactor /= 2.0f;
  }
  while (audioFactor < 0.5f) {
    cmd << "atempo=0.5,";
    audioFactor *= 2.0f;
  }
  cmd << "atempo=" << audioFactor << "[a]\" ";

  cmd << "-map \"[v]\" -map \"[a]\" ";
  cmd << "-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k ";
  cmd << "-movflags +faststart \"" << outPath << "\"";

  bool ok = runFfmpeg(cmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg speed adjustment failed");
  }

  removeTempFile(inPath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoReverse - Reverse video and audio playback
 */
ArgumentMap VideoReverse(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                         [[maybe_unused]] ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  outType = type;

  string inPath = makeTempPath("." + type);
  string outPath = makeTempPath("." + type);

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  ostringstream cmd;
  cmd << "ffmpeg -y -i \"" << inPath << "\" ";
  cmd << "-vf reverse -af areverse ";
  cmd << "-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k ";
  cmd << "-movflags +faststart \"" << outPath << "\"";

  bool ok = runFfmpeg(cmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg reverse failed");
  }

  removeTempFile(inPath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoCaption - Add text caption to video
 * Parameters: caption (string), position (string: "top"/"bottom"), font_size (int)
 */
ArgumentMap VideoCaption(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                         ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  string caption = GetArgumentWithFallback<string>(arguments, "caption", string(""));
  string position = GetArgumentWithFallback<string>(arguments, "position", string("top"));
  int fontSize = GetArgumentWithFallback<int>(arguments, "font_size", 32);

  if (fontSize < 12) fontSize = 12;
  if (fontSize > 72) fontSize = 72;

  outType = type;

  string inPath = makeTempPath("." + type);
  string outPath = makeTempPath("." + type);

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  string escaped = escapeDrawtext(caption);
  string yPos = (position == "bottom") ? "(h-th-20)" : "20";

  ostringstream cmd;
  cmd << "ffmpeg -y -i \"" << inPath << "\" ";
  cmd << "-vf \"drawtext=text='" << escaped << "'";
  cmd << ":fontsize=" << fontSize;
  cmd << ":fontcolor=white:borderw=3:bordercolor=black";
  cmd << ":x=(w-tw)/2:y=" << yPos << "\" ";
  cmd << "-c:v libx264 -preset fast -crf 23 -c:a copy ";
  cmd << "-movflags +faststart \"" << outPath << "\"";

  bool ok = runFfmpeg(cmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg caption failed");
  }

  removeTempFile(inPath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoToGif - Convert video to animated GIF
 * Parameters: fps (int), width (int)
 */
ArgumentMap VideoToGif(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                       ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  int fps = GetArgumentWithFallback<int>(arguments, "fps", 15);
  int width = GetArgumentWithFallback<int>(arguments, "width", 480);

  if (fps < 5) fps = 5;
  if (fps > 30) fps = 30;
  if (width < 120) width = 120;
  if (width > 720) width = 720;

  outType = "gif";

  string inPath = makeTempPath("." + type);
  string palettePath = makeTempPath(".png");
  string outPath = makeTempPath(".gif");

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  // Pass 1: Generate palette
  ostringstream paletteCmd;
  paletteCmd << "ffmpeg -y -i \"" << inPath << "\" ";
  paletteCmd << "-vf \"fps=" << fps << ",scale=" << width << ":-1:flags=lanczos,palettegen\" ";
  paletteCmd << "\"" << palettePath << "\"";

  if (!runFfmpeg(paletteCmd.str())) {
    removeTempFile(inPath);
    removeTempFile(palettePath);
    return makeError("FFmpeg palette generation failed");
  }

  // Pass 2: Generate GIF with palette
  ostringstream gifCmd;
  gifCmd << "ffmpeg -y -i \"" << inPath << "\" -i \"" << palettePath << "\" ";
  gifCmd << "-lavfi \"fps=" << fps << ",scale=" << width << ":-1:flags=lanczos[x];[x][1:v]paletteuse\" ";
  gifCmd << "\"" << outPath << "\"";

  bool ok = runFfmpeg(gifCmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg GIF conversion failed");
  }

  removeTempFile(inPath);
  removeTempFile(palettePath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoTrim - Trim video to specified duration
 * Parameters: start (float), duration (float)
 */
ArgumentMap VideoTrim(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                      ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  float start = GetArgumentWithFallback<float>(arguments, "start", 0.0f);
  float duration = GetArgumentWithFallback<float>(arguments, "duration", 10.0f);

  if (start < 0.0f) start = 0.0f;
  if (duration < 0.5f) duration = 0.5f;
  if (duration > 60.0f) duration = 60.0f;

  outType = type;

  string inPath = makeTempPath("." + type);
  string outPath = makeTempPath("." + type);

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  ostringstream cmd;
  cmd << "ffmpeg -y -ss " << start << " -i \"" << inPath << "\" ";
  cmd << "-t " << duration << " ";
  cmd << "-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k ";
  cmd << "-movflags +faststart \"" << outPath << "\"";

  bool ok = runFfmpeg(cmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg trim failed");
  }

  removeTempFile(inPath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoMeme - Add top/bottom meme text to video
 * Parameters: top (string), bottom (string), font_size (int)
 */
ArgumentMap VideoMeme(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                      ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  string topText = GetArgumentWithFallback<string>(arguments, "top", string(""));
  string bottomText = GetArgumentWithFallback<string>(arguments, "bottom", string(""));
  int fontSize = GetArgumentWithFallback<int>(arguments, "font_size", 48);

  if (fontSize < 16) fontSize = 16;
  if (fontSize > 96) fontSize = 96;

  outType = type;

  string inPath = makeTempPath("." + type);
  string outPath = makeTempPath("." + type);

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  string escapedTop = escapeDrawtext(topText);
  string escapedBottom = escapeDrawtext(bottomText);

  // Build filter chain
  ostringstream filter;
  bool hasFilter = false;

  if (!topText.empty()) {
    filter << "drawtext=text='" << escapedTop << "'";
    filter << ":fontsize=" << fontSize;
    filter << ":fontcolor=white:borderw=4:bordercolor=black";
    filter << ":x=(w-tw)/2:y=20";
    hasFilter = true;
  }

  if (!bottomText.empty()) {
    if (hasFilter) filter << ",";
    filter << "drawtext=text='" << escapedBottom << "'";
    filter << ":fontsize=" << fontSize;
    filter << ":fontcolor=white:borderw=4:bordercolor=black";
    filter << ":x=(w-tw)/2:y=(h-th-20)";
    hasFilter = true;
  }

  ostringstream cmd;
  cmd << "ffmpeg -y -i \"" << inPath << "\" ";
  if (hasFilter) {
    cmd << "-vf \"" << filter.str() << "\" ";
  }
  cmd << "-c:v libx264 -preset fast -crf 23 -c:a copy ";
  cmd << "-movflags +faststart \"" << outPath << "\"";

  bool ok = runFfmpeg(cmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg meme failed");
  }

  removeTempFile(inPath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoStitch - Concatenate two videos
 * Parameters: buffer2 (char*), buffer2_len (size_t)
 */
ArgumentMap VideoStitch(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                        ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  char *buffer2 = GetArgumentWithFallback<char *>(arguments, "buffer2", nullptr);
  size_t buffer2Len = GetArgumentWithFallback<size_t>(arguments, "buffer2_len", static_cast<size_t>(0));

  if (!buffer2 || buffer2Len == 0) {
    return makeError("Second video required for stitching");
  }

  outType = type;

  string inPath1 = makeTempPath("." + type);
  string inPath2 = makeTempPath("." + type);
  string listPath = makeTempPath(".txt");
  string outPath = makeTempPath("." + type);

  if (!writeFile(inPath1, bufferData, bufferLength) || !writeFile(inPath2, buffer2, buffer2Len)) {
    removeTempFile(inPath1);
    removeTempFile(inPath2);
    return makeError("Failed to write input files");
  }

  // Write concat list
  {
    ofstream listFile(listPath);
    listFile << "file '" << inPath1 << "'\n";
    listFile << "file '" << inPath2 << "'\n";
  }

  ostringstream cmd;
  cmd << "ffmpeg -y -f concat -safe 0 -i \"" << listPath << "\" ";
  cmd << "-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k ";
  cmd << "-movflags +faststart \"" << outPath << "\"";

  bool ok = runFfmpeg(cmd.str());

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg stitch failed");
  }

  removeTempFile(inPath1);
  removeTempFile(inPath2);
  removeTempFile(listPath);
  removeTempFile(outPath);
  return result;
}

/**
 * VideoAudio - Extract audio from video as MP3
 */
ArgumentMap VideoAudio(const string &type, string &outType, const char *bufferData, size_t bufferLength,
                       [[maybe_unused]] ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
  outType = "mp3";

  string inPath = makeTempPath("." + type);
  string outPath = makeTempPath(".mp3");

  if (!writeFile(inPath, bufferData, bufferLength)) {
    return makeError("Failed to write input file");
  }

  // Try multiple approaches to extract audio
  bool ok = false;
  
  // First attempt: Use libmp3lame with explicit audio stream mapping
  ostringstream cmd1;
  cmd1 << "ffmpeg -y -i \"" << inPath << "\" ";
  cmd1 << "-vn -map 0:a:0 -acodec libmp3lame -q:a 2 ";
  cmd1 << "\"" << outPath << "\"";
  ok = runFfmpeg(cmd1.str());

  // Second attempt: Use built-in MP3 encoder if libmp3lame isn't available
  if (!ok || !fs::exists(outPath)) {
    removeTempFile(outPath);
    ostringstream cmd2;
    cmd2 << "ffmpeg -y -i \"" << inPath << "\" ";
    cmd2 << "-vn -map 0:a? -acodec mp3 -q:a 2 ";
    cmd2 << "\"" << outPath << "\"";
    ok = runFfmpeg(cmd2.str());
  }

  // Third attempt: Convert to AAC first, then to MP3 (for problematic codecs)
  if (!ok || !fs::exists(outPath)) {
    removeTempFile(outPath);
    ostringstream cmd3;
    cmd3 << "ffmpeg -y -i \"" << inPath << "\" ";
    cmd3 << "-vn -acodec libmp3lame -ar 44100 -ac 2 -b:a 192k ";
    cmd3 << "\"" << outPath << "\"";
    ok = runFfmpeg(cmd3.str());
  }

  // Fourth attempt: Simple copy if input already has MP3 audio
  if (!ok || !fs::exists(outPath)) {
    removeTempFile(outPath);
    ostringstream cmd4;
    cmd4 << "ffmpeg -y -i \"" << inPath << "\" ";
    cmd4 << "-vn -acodec copy ";
    cmd4 << "\"" << outPath << "\"";
    ok = runFfmpeg(cmd4.str());
  }

  ArgumentMap result;
  if (ok && fs::exists(outPath)) {
    size_t outSize = 0;
    char *outBuf = readFile(outPath, outSize);
    if (outBuf) {
      result = makeOutput(outBuf, outSize);
    } else {
      result = makeError("Failed to read output file");
    }
  } else {
    result = makeError("FFmpeg audio extraction failed");
  }

  removeTempFile(inPath);
  removeTempFile(outPath);
  return result;
}
