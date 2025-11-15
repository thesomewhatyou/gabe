import { fileTypeFromBuffer } from "file-type";
import { Message } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { runImageJob } from "#utils/image.js";
import logger from "#utils/logger.js";
import { clean, cleanMessage, textEncode } from "#utils/misc.js";

const MAX_QUOTE_LENGTH = 480;
const MAX_NAME_LENGTH = 64;

class QuoteMessageCommand extends Command {
  async run() {
    if (!(this.interaction?.data.target instanceof Message)) {
      throw Error("Target is not a message");
    }

    const targetMessage = this.interaction.data.target;

    const baseContent = targetMessage.content ? cleanMessage(targetMessage, targetMessage.content).trim() : "";
    let text = baseContent;

    if (!text) {
      const firstEmbed = targetMessage.embeds.find((embed) => embed.description?.trim() || embed.title?.trim());
      const embedText = firstEmbed?.description?.trim() ?? firstEmbed?.title?.trim() ?? "";
      text = embedText ? textEncode(embedText) : "";
    }

    if (!text) {
      return this.getString("commands.responses.Quote Message.noContent");
    }

    if (text.length > MAX_QUOTE_LENGTH) {
      text = `${text.slice(0, MAX_QUOTE_LENGTH - 1).trimEnd()}…`;
    }

    let displayName =
      targetMessage.member?.nick?.trim() || targetMessage.author.globalName?.trim() || targetMessage.author.username;

    if (displayName.length > MAX_NAME_LENGTH) {
      displayName = `${displayName.slice(0, MAX_NAME_LENGTH - 1).trimEnd()}…`;
    }
    const avatarURL = targetMessage.author.avatarURL("png", 512);
    let avatarBuffer;
    let contentType;

    try {
      const avatarResponse = await fetch(avatarURL);
      if (!avatarResponse.ok) {
        return this.getString("commands.responses.Quote Message.avatarError");
      }
      const arrayBuffer = await avatarResponse.arrayBuffer();
      avatarBuffer = Buffer.from(arrayBuffer);

      const headerType = avatarResponse.headers.get("content-type") ?? "";
      contentType = headerType ? headerType : "image/png";
      if (contentType.includes(";")) {
        contentType = contentType.split(";")[0];
      }
      contentType = contentType.toLowerCase();

      const detectedType = await fileTypeFromBuffer(avatarBuffer);
      const detectedMime = detectedType?.mime;
      if (detectedMime) {
        contentType = detectedMime;
      }

      logger.info(
        {
          avatarURL,
          headerType,
          detectedMime,
          finalType: contentType,
          bufferLength: avatarBuffer.length,
        },
        "Quote avatar fetched",
      );
    } catch {
      return this.getString("commands.responses.Quote Message.avatarError");
    }

    const decoratedQuote = `“${text}”`;
    const sanitizedDisplayName = textEncode(displayName);

    logger.info({ text: decoratedQuote, username: displayName }, "Quote command payload");

    const imageParams = {
      cmd: "quote",
      params: {
        text: decoratedQuote,
        username: sanitizedDisplayName,
      },
      input: {
        data: avatarBuffer,
        type: contentType,
      },
      id: this.interaction.id,
    };

    logger.info({ cmd: imageParams.cmd, paramKeys: Object.keys(imageParams.params) }, "Quote command params");

    try {
      const { buffer, type } = await runImageJob(imageParams);

      if (type === "nocmd") return this.getString("image.nocmd");
      if (type === "noresult") return this.getString("image.noResult");
      if (type === "ratelimit") return this.getString("image.ratelimit");
      if (type === "unknown") return this.getString("image.unknown");
      if (type === "empty") return this.getString("image.noResult");

      if (type === "text") {
        this.success = true;
        return {
          content: `\`\`\`\n${clean(buffer.toString("utf8"), true)}\n\`\`\``,
        };
      }

      this.success = true;
      return {
        files: [
          {
            contents: buffer,
            name: `quote.${type}`,
          },
        ],
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          err,
          message: err.message,
          stack: err.stack,
          type: imageParams.input?.type,
          bufferLength: avatarBuffer?.length,
          detail: "detail" in err ? err.detail : undefined,
          props: err ? Object.getOwnPropertyNames(err) : [],
        },
        "Quote command image failure",
      );
      const message = err.toString();
      if (message.includes("image_not_working")) return this.getString("image.notWorking");
      if (message.includes("Request ended prematurely due to a closed connection"))
        return this.getString("image.tryAgain");
      if (message.includes("image_job_killed") || message.includes("Timeout")) return this.getString("image.tooLong");
      if (message.includes("No available servers")) return this.getString("image.noServers");
      throw err;
    }
  }

  static description = "Turn a message into a shareable quote image";
  static slashAllowed = false;
}

export default QuoteMessageCommand;
