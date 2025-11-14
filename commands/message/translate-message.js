import { Message } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { cleanMessage } from "#utils/misc.js";

class TranslateMessageCommand extends Command {
  async run() {
    await this.acknowledge();

    const targetMessage = this.interaction?.data.target;
    if (!(targetMessage instanceof Message)) {
      throw Error("Target is not a message");
    }

    // Get message content
    const baseContent = targetMessage.content ? cleanMessage(targetMessage, targetMessage.content).trim() : "";
    let text = baseContent;

    // Try to get content from embeds if message has no text
    if (!text) {
      const firstEmbed = targetMessage.embeds.find((embed) => embed.description?.trim() || embed.title?.trim());
      text = firstEmbed?.description?.trim() ?? firstEmbed?.title?.trim() ?? "";
    }

    if (!text || !text.trim()) {
      this.success = false;
      return "❌ Gabe says: That message has no text to translate. What am I, a mind reader?";
    }

    // Limit text length for API
    if (text.length > 500) {
      text = text.slice(0, 497) + "...";
    }

    // Use MyMemory Translation API (free, no API key needed)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`;
      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.success = false;
        return "❌ Gabe says: Translation service is down. Try again later!";
      }

      const data = await response.json();

      if (data.responseStatus !== 200) {
        this.success = false;
        return "❌ Gabe says: Couldn't translate that. Maybe it's already in English?";
      }

      const translatedText = data.responseData.translatedText;
      const detectedLang = data.responseData.match || "Unknown";

      // If the translation is the same as original, it's probably already in English
      if (translatedText.toLowerCase() === text.toLowerCase()) {
        this.success = false;
        return "🤔 Gabe says: This message is already in English (or couldn't be translated).";
      }

      this.success = true;
      return {
        embeds: [
          {
            title: "🌐 Translation",
            color: 0xff0000,
            fields: [
              {
                name: "Original",
                value: text.length > 1024 ? text.slice(0, 1021) + "..." : text,
                inline: false,
              },
              {
                name: "Translated to English",
                value: translatedText.length > 1024 ? translatedText.slice(0, 1021) + "..." : translatedText,
                inline: false,
              },
            ],
            footer: {
              text: `Detected language: ${detectedLang} | Powered by MyMemory`,
            },
          },
        ],
      };
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof DOMException && e.name === "AbortError") {
        this.success = false;
        return "❌ Gabe says: Translation took too long. The message might be too complex!";
      }
      this.success = false;
      return `❌ Gabe says: Translation failed. ${e.message}`;
    }
  }

  static description = "Translate a message to English";
  static slashAllowed = false;
}

export default TranslateMessageCommand;
