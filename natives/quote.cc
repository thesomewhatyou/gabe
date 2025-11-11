#include <algorithm>
#include <string>
#include <vips/vips8>

#include "common.h"

using namespace std;
using namespace vips;

ArgumentMap Quote(const string &type, string &outType, const char *bufferdata, size_t bufferLength,
                  ArgumentMap arguments, bool *shouldKill) {
  string text = GetArgument<string>(arguments, "text");
  string username = GetArgument<string>(arguments, "username");
  string basePath = GetArgument<string>(arguments, "basePath");

  VImage avatar = VImage::new_from_buffer(bufferdata, bufferLength, "", GetInputOptions(type, true, false))
                    .colourspace(VIPS_INTERPRETATION_sRGB);
  if (!avatar.has_alpha()) avatar = avatar.bandjoin(255);

  VImage alpha = avatar.extract_band(avatar.bands() - 1);
  VImage grayscale =
    avatar.extract_band(0, VImage::option()->set("n", avatar.bands() - 1))
      .colourspace(VIPS_INTERPRETATION_B_W)
      .colourspace(VIPS_INTERPRETATION_sRGB)
      .bandjoin(alpha);

  const int avatarTarget = 320;
  double scale = min((double)avatarTarget / (double)grayscale.width(), (double)avatarTarget / (double)grayscale.height());
  if (scale <= 0) scale = 1.0;
  grayscale = grayscale.resize(scale, VImage::option()->set("kernel", VIPS_KERNEL_LANCZOS3));

  int avatarWidth = grayscale.width();
  int avatarHeight = grayscale.height();
  int canvasWidth = max(avatarTarget, avatarWidth);
  int canvasHeight = max(avatarTarget, avatarHeight);

  VImage avatarCanvas =
    VImage::black(canvasWidth, canvasHeight)
      .new_from_image({0, 0, 0, 0})
      .copy(VImage::option()->set("interpretation", VIPS_INTERPRETATION_sRGB));

  int avatarOffsetX = (canvasWidth - avatarWidth) / 2;
  int avatarOffsetY = (canvasHeight - avatarHeight) / 2;
  avatarCanvas =
    avatarCanvas.insert(grayscale, avatarOffsetX, avatarOffsetY, VImage::option()->set("expand", true));

  const int framePadding = 24;
  VImage framedAvatar =
    VImage::black(canvasWidth + framePadding * 2, canvasHeight + framePadding * 2)
      .new_from_image({32, 32, 32})
      .copy(VImage::option()->set("interpretation", VIPS_INTERPRETATION_sRGB));
  framedAvatar = framedAvatar.bandjoin(255);
  framedAvatar = framedAvatar.composite2(
    avatarCanvas, VIPS_BLEND_MODE_OVER,
    VImage::option()->set("x", framePadding)->set("y", framePadding));

  LoadFonts(basePath);

  string fontPath = basePath + "assets/fonts/Ubuntu.ttf";

  const int textWidth = 720;
  VImage nameImage = VImage::text(
    ("<span foreground=\"#f5f5f5\" font_weight=\"bold\">" + username + "</span>").c_str(),
    VImage::option()
      ->set("rgba", true)
      ->set("font", "Ubuntu 58")
      ->set("fontfile", fontPath.c_str())
  ->set("align", VIPS_ALIGN_LOW)
      ->set("width", textWidth));

  VImage quoteImage = VImage::text(
    ("<span foreground=\"#ffffff\">" + text + "</span>").c_str(),
    VImage::option()
      ->set("rgba", true)
      ->set("font", "Ubuntu 46")
      ->set("fontfile", fontPath.c_str())
  ->set("align", VIPS_ALIGN_LOW)
      ->set("wrap", VIPS_TEXT_WRAP_WORD)
      ->set("width", textWidth));

  const int innerPadding = 60;
  int textAreaWidth = max(nameImage.width(), quoteImage.width()) + innerPadding * 2;
  int textAreaHeight = nameImage.height() + quoteImage.height() + innerPadding * 3;

  VImage textBackground =
    VImage::black(textAreaWidth, textAreaHeight)
      .new_from_image({0, 0, 0})
      .copy(VImage::option()->set("interpretation", VIPS_INTERPRETATION_sRGB));
  textBackground = textBackground.bandjoin(255);

  VImage textBlock = textBackground.composite2(
    nameImage, VIPS_BLEND_MODE_OVER,
    VImage::option()->set("x", innerPadding)->set("y", innerPadding));

  textBlock = textBlock.composite2(
    quoteImage, VIPS_BLEND_MODE_OVER,
    VImage::option()->set("x", innerPadding)
      ->set("y", innerPadding * 2 + nameImage.height()));

  const int outerPadding = 80;
  const int columnSpacing = 80;
  int contentHeight = max(framedAvatar.height(), textBlock.height());
  int finalWidth = outerPadding * 2 + framedAvatar.width() + columnSpacing + textBlock.width();
  int finalHeight = outerPadding * 2 + contentHeight;

  VImage background =
    VImage::black(finalWidth, finalHeight)
      .new_from_image({18, 18, 18})
      .copy(VImage::option()->set("interpretation", VIPS_INTERPRETATION_sRGB));
  background = background.bandjoin(255);

  int avatarY = outerPadding + (contentHeight - framedAvatar.height()) / 2;
  int textY = outerPadding + (contentHeight - textBlock.height()) / 2;
  int textX = outerPadding + framedAvatar.width() + columnSpacing;

  VImage composed = background.composite2(
    framedAvatar, VIPS_BLEND_MODE_OVER,
    VImage::option()->set("x", outerPadding)->set("y", avatarY));

  composed = composed.composite2(
    textBlock, VIPS_BLEND_MODE_OVER,
    VImage::option()->set("x", textX)->set("y", textY));

  SetupTimeoutCallback(composed, shouldKill);

  outType = "png";

  char *buf;
  size_t dataSize = 0;
  composed.write_to_buffer(("." + outType).c_str(), reinterpret_cast<void **>(&buf), &dataSize);

  ArgumentMap output;
  output["buf"] = buf;
  output["size"] = dataSize;

  return output;
}
