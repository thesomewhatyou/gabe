/**
 * Video Processing Module for Gabe Discord Bot
 * 
 * This module provides video manipulation capabilities using FFmpeg.
 * Operations include: caption, speed, reverse, trim, and gif conversion.
 * 
 * Requires: libavcodec, libavformat, libavutil, libavfilter, libswscale
 */

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
#include <filesystem>
#include <random>
#include <chrono>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libavutil/opt.h>
#include <libavutil/timestamp.h>
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersink.h>
#include <libavfilter/buffersrc.h>
#include <libswscale/swscale.h>
}

#include "common.h"

using namespace std;

namespace fs = std::filesystem;

// Generate a unique temporary filename
string generateTempFilename(const string& extension) {
    auto now = chrono::system_clock::now();
    auto timestamp = chrono::duration_cast<chrono::nanoseconds>(now.time_since_epoch()).count();
    random_device rd;
    mt19937 gen(rd());
    uniform_int_distribution<> dis(0, 999999);
    
    ostringstream oss;
    oss << "/tmp/gabe_video_" << timestamp << "_" << dis(gen) << extension;
    return oss.str();
}

// Cleanup temporary files
void cleanupTempFile(const string& path) {
    try {
        if (fs::exists(path)) {
            fs::remove(path);
        }
    } catch (...) {
        // Ignore cleanup errors
    }
}

/**
 * Apply speed modification to video using FFmpeg filter
 * Supports both speedup and slowdown
 */
ArgumentMap VideoSpeed(const string &type, string &outType, const char *bufferData,
                       size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    float speed = GetArgumentWithFallback<float>(arguments, "speed", 2.0f);
    bool slow = GetArgumentWithFallback<bool>(arguments, "slow", false);
    
    // Clamp speed to reasonable values
    if (speed < 0.25f) speed = 0.25f;
    if (speed > 4.0f) speed = 4.0f;
    
    // If slowing down, invert the speed factor
    float actualSpeed = slow ? (1.0f / speed) : speed;
    
    // Determine input/output extensions based on type
    string inputExt = "." + type;
    string outputExt = inputExt;
    outType = type;
    
    // Write input buffer to temp file
    string inputPath = generateTempFilename(inputExt);
    string outputPath = generateTempFilename(outputExt);
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    // Build FFmpeg filter string for speed adjustment
    // Video: setpts=PTS/speed, Audio: atempo=speed (atempo only supports 0.5-2.0)
    ostringstream filterCmd;
    filterCmd << "ffmpeg -y -i \"" << inputPath << "\" ";
    
    // Build complex filter for video speed
    filterCmd << "-filter_complex \"[0:v]setpts=" << (1.0f / actualSpeed) << "*PTS[v]";
    
    // Handle audio tempo (atempo filter has limits, chain multiple for extreme speeds)
    float audioSpeed = actualSpeed;
    filterCmd << ";[0:a]";
    
    // atempo only supports 0.5 to 2.0, chain multiple filters for extreme speeds
    while (audioSpeed > 2.0f) {
        filterCmd << "atempo=2.0,";
        audioSpeed /= 2.0f;
    }
    while (audioSpeed < 0.5f) {
        filterCmd << "atempo=0.5,";
        audioSpeed *= 2.0f;
    }
    filterCmd << "atempo=" << audioSpeed << "[a]\" ";
    
    filterCmd << "-map \"[v]\" -map \"[a]\" ";
    filterCmd << "-c:v libx264 -preset fast -crf 23 ";
    filterCmd << "-c:a aac -b:a 128k ";
    filterCmd << "-movflags +faststart ";
    filterCmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(filterCmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        // Read output file into buffer
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Video speed adjustment failed");
    }
    
    // Cleanup
    cleanupTempFile(inputPath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Reverse a video
 */
ArgumentMap VideoReverse(const string &type, string &outType, const char *bufferData,
                         size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    string inputExt = "." + type;
    string outputExt = inputExt;
    outType = type;
    
    string inputPath = generateTempFilename(inputExt);
    string outputPath = generateTempFilename(outputExt);
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    // Reverse video and audio
    ostringstream cmd;
    cmd << "ffmpeg -y -i \"" << inputPath << "\" ";
    cmd << "-vf reverse -af areverse ";
    cmd << "-c:v libx264 -preset fast -crf 23 ";
    cmd << "-c:a aac -b:a 128k ";
    cmd << "-movflags +faststart ";
    cmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(cmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Video reverse failed");
    }
    
    cleanupTempFile(inputPath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Add caption to video (top or bottom text)
 */
ArgumentMap VideoCaption(const string &type, string &outType, const char *bufferData,
                         size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    string caption = GetArgumentWithFallback<string>(arguments, "caption", string(""));
    string position = GetArgumentWithFallback<string>(arguments, "position", string("top"));
    int fontSize = GetArgumentWithFallback<int>(arguments, "font_size", 32);
    
    string inputExt = "." + type;
    string outputExt = inputExt;
    outType = type;
    
    string inputPath = generateTempFilename(inputExt);
    string outputPath = generateTempFilename(outputExt);
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    // Escape special characters for FFmpeg drawtext filter
    string escapedCaption;
    for (char c : caption) {
        if (c == '\'' || c == ':' || c == '\\') {
            escapedCaption += '\\';
        }
        escapedCaption += c;
    }
    
    // Calculate Y position
    string yPos = (position == "bottom") ? "(h-th-20)" : "20";
    
    ostringstream cmd;
    cmd << "ffmpeg -y -i \"" << inputPath << "\" ";
    cmd << "-vf \"drawtext=text='" << escapedCaption << "'";
    cmd << ":fontsize=" << fontSize;
    cmd << ":fontcolor=white:borderw=3:bordercolor=black";
    cmd << ":x=(w-tw)/2:y=" << yPos << "\" ";
    cmd << "-c:v libx264 -preset fast -crf 23 ";
    cmd << "-c:a copy ";
    cmd << "-movflags +faststart ";
    cmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(cmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Video caption failed");
    }
    
    cleanupTempFile(inputPath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Convert video to GIF
 */
ArgumentMap VideoToGif(const string &type, string &outType, const char *bufferData,
                       size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    int fps = GetArgumentWithFallback<int>(arguments, "fps", 15);
    int width = GetArgumentWithFallback<int>(arguments, "width", 480);
    
    // Clamp values
    if (fps < 5) fps = 5;
    if (fps > 30) fps = 30;
    if (width < 120) width = 120;
    if (width > 720) width = 720;
    
    string inputExt = "." + type;
    outType = "gif";
    
    string inputPath = generateTempFilename(inputExt);
    string palettePath = generateTempFilename(".png");
    string outputPath = generateTempFilename(".gif");
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    // Two-pass GIF generation for better quality
    // Pass 1: Generate palette
    ostringstream paletteCmd;
    paletteCmd << "ffmpeg -y -i \"" << inputPath << "\" ";
    paletteCmd << "-vf \"fps=" << fps << ",scale=" << width << ":-1:flags=lanczos,palettegen\" ";
    paletteCmd << "\"" << palettePath << "\" 2>/dev/null";
    
    int result = system(paletteCmd.str().c_str());
    
    ArgumentMap output;
    
    if (result != 0) {
        output["error"] = string("GIF palette generation failed");
        cleanupTempFile(inputPath);
        cleanupTempFile(palettePath);
        return output;
    }
    
    // Pass 2: Generate GIF using palette
    ostringstream gifCmd;
    gifCmd << "ffmpeg -y -i \"" << inputPath << "\" -i \"" << palettePath << "\" ";
    gifCmd << "-lavfi \"fps=" << fps << ",scale=" << width << ":-1:flags=lanczos[x];[x][1:v]paletteuse\" ";
    gifCmd << "\"" << outputPath << "\" 2>/dev/null";
    
    result = system(gifCmd.str().c_str());
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("GIF conversion failed");
    }
    
    cleanupTempFile(inputPath);
    cleanupTempFile(palettePath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Trim/cut video to specified duration
 */
ArgumentMap VideoTrim(const string &type, string &outType, const char *bufferData,
                      size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    float start = GetArgumentWithFallback<float>(arguments, "start", 0.0f);
    float duration = GetArgumentWithFallback<float>(arguments, "duration", 10.0f);
    
    // Clamp values
    if (start < 0) start = 0;
    if (duration < 0.5f) duration = 0.5f;
    if (duration > 60.0f) duration = 60.0f;  // Max 60 seconds
    
    string inputExt = "." + type;
    string outputExt = inputExt;
    outType = type;
    
    string inputPath = generateTempFilename(inputExt);
    string outputPath = generateTempFilename(outputExt);
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    ostringstream cmd;
    cmd << "ffmpeg -y -ss " << start << " -i \"" << inputPath << "\" ";
    cmd << "-t " << duration << " ";
    cmd << "-c:v libx264 -preset fast -crf 23 ";
    cmd << "-c:a aac -b:a 128k ";
    cmd << "-movflags +faststart ";
    cmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(cmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Video trim failed");
    }
    
    cleanupTempFile(inputPath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Add classic top/bottom meme text to video
 */
ArgumentMap VideoMeme(const string &type, string &outType, const char *bufferData,
                      size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    string topText = GetArgumentWithFallback<string>(arguments, "top", string(""));
    string bottomText = GetArgumentWithFallback<string>(arguments, "bottom", string(""));
    int fontSize = GetArgumentWithFallback<int>(arguments, "font_size", 48);
    
    string inputExt = "." + type;
    string outputExt = inputExt;
    outType = type;
    
    string inputPath = generateTempFilename(inputExt);
    string outputPath = generateTempFilename(outputExt);
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    // Escape text for FFmpeg
    auto escapeText = [](const string& text) {
        string escaped;
        for (char c : text) {
            if (c == '\'' || c == ':' || c == '\\') {
                escaped += '\\';
            }
            escaped += c;
        }
        return escaped;
    };
    
    string escapedTop = escapeText(topText);
    string escapedBottom = escapeText(bottomText);
    
    // Build filter chain
    ostringstream filter;
    filter << "-vf \"";
    
    if (!topText.empty()) {
        filter << "drawtext=text='" << escapedTop << "'";
        filter << ":fontsize=" << fontSize;
        filter << ":fontcolor=white:borderw=4:bordercolor=black";
        filter << ":x=(w-tw)/2:y=20";
    }
    
    if (!bottomText.empty()) {
        if (!topText.empty()) filter << ",";
        filter << "drawtext=text='" << escapedBottom << "'";
        filter << ":fontsize=" << fontSize;
        filter << ":fontcolor=white:borderw=4:bordercolor=black";
        filter << ":x=(w-tw)/2:y=(h-th-20)";
    }
    
    filter << "\"";
    
    ostringstream cmd;
    cmd << "ffmpeg -y -i \"" << inputPath << "\" ";
    cmd << filter.str() << " ";
    cmd << "-c:v libx264 -preset fast -crf 23 ";
    cmd << "-c:a copy ";
    cmd << "-movflags +faststart ";
    cmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(cmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Video meme creation failed");
    }
    
    cleanupTempFile(inputPath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Stitch/concatenate two videos together
 */
ArgumentMap VideoStitch(const string &type, string &outType, const char *bufferData,
                        size_t bufferLength, ArgumentMap arguments, [[maybe_unused]] bool *shouldKill) {
    // Second video data passed as arguments
    char *buffer2Data = GetArgumentWithFallback<char*>(arguments, "buffer2", nullptr);
    size_t buffer2Length = GetArgumentWithFallback<size_t>(arguments, "buffer2_len", (size_t)0);
    
    if (buffer2Data == nullptr || buffer2Length == 0) {
        ArgumentMap output;
        output["error"] = string("Second video required for stitching");
        return output;
    }
    
    string inputExt = "." + type;
    string outputExt = inputExt;
    outType = type;
    
    string inputPath1 = generateTempFilename(inputExt);
    string inputPath2 = generateTempFilename(inputExt);
    string listPath = generateTempFilename(".txt");
    string outputPath = generateTempFilename(outputExt);
    
    // Write both videos to temp files
    {
        ofstream outFile1(inputPath1, ios::binary);
        outFile1.write(bufferData, bufferLength);
        
        ofstream outFile2(inputPath2, ios::binary);
        outFile2.write(buffer2Data, buffer2Length);
        
        // Write concat list file
        ofstream listFile(listPath);
        listFile << "file '" << inputPath1 << "'\n";
        listFile << "file '" << inputPath2 << "'\n";
    }
    
    // Use concat demuxer for same-codec videos
    ostringstream cmd;
    cmd << "ffmpeg -y -f concat -safe 0 -i \"" << listPath << "\" ";
    cmd << "-c:v libx264 -preset fast -crf 23 ";
    cmd << "-c:a aac -b:a 128k ";
    cmd << "-movflags +faststart ";
    cmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(cmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Video stitch failed");
    }
    
    cleanupTempFile(inputPath1);
    cleanupTempFile(inputPath2);
    cleanupTempFile(listPath);
    cleanupTempFile(outputPath);
    
    return output;
}

/**
 * Extract audio from video
 */
ArgumentMap VideoAudio(const string &type, string &outType, const char *bufferData,
                       size_t bufferLength, [[maybe_unused]] ArgumentMap arguments, 
                       [[maybe_unused]] bool *shouldKill) {
    string inputExt = "." + type;
    outType = "mp3";
    
    string inputPath = generateTempFilename(inputExt);
    string outputPath = generateTempFilename(".mp3");
    
    {
        ofstream outFile(inputPath, ios::binary);
        outFile.write(bufferData, bufferLength);
    }
    
    ostringstream cmd;
    cmd << "ffmpeg -y -i \"" << inputPath << "\" ";
    cmd << "-vn -acodec libmp3lame -b:a 192k ";
    cmd << "\"" << outputPath << "\" 2>/dev/null";
    
    int result = system(cmd.str().c_str());
    
    ArgumentMap output;
    
    if (result == 0 && fs::exists(outputPath)) {
        ifstream inFile(outputPath, ios::binary | ios::ate);
        size_t fileSize = inFile.tellg();
        inFile.seekg(0, ios::beg);
        
        char *outputBuffer = (char *)malloc(fileSize);
        inFile.read(outputBuffer, fileSize);
        
        output["buf"] = outputBuffer;
        output["size"] = fileSize;
    } else {
        output["error"] = string("Audio extraction failed");
    }
    
    cleanupTempFile(inputPath);
    cleanupTempFile(outputPath);
    
    return output;
}
