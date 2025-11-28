import Command from "#cmd-classes/command.js";
import { locales } from "#utils/collections.js";

class LanguagesCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }

    await this.acknowledge();

    const availableLocales = [...locales.keys()].sort((a, b) => a.localeCompare(b));

    let displayNameFormatter;
    if (typeof Intl.DisplayNames === "function") {
      try {
        displayNameFormatter = new Intl.DisplayNames([this.locale], { type: "language" });
      } catch {
        displayNameFormatter = undefined;
      }
    }

    const lines = availableLocales.map((code) => {
      let displayName = code;
      if (displayNameFormatter) {
        try {
          displayName = displayNameFormatter.of(code) ?? code;
        } catch {
          displayName = code;
        }
      }
      const isCurrent = code === this.locale;
      const suffix = isCurrent ? ` ${this.getString("commands.responses.languages.current")}` : "";
      return `• **${displayName}** (\`${code}\`)${suffix}`;
    });

    return {
      embeds: [
        {
          color: 0xff0000,
          title: this.getString("commands.responses.languages.title"),
          description:
            lines.length > 0
              ? `${lines.join("\n")}\n\n${this.getString("commands.responses.languages.contribute")}`
              : this.getString("commands.responses.languages.none"),
          footer: {
            text: this.getString("commands.responses.languages.footer", {
              params: { count: availableLocales.length.toString() },
            }),
          },
        },
      ],
    };
  }

  static description = "See which languages Gabe can currently speak";
  static aliases = ["locale", "locales", "translations"];
}

export default LanguagesCommand;
