import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class MockCommand extends Command {
  async run() {
    const text = this.getOptionString("text") ?? this.args.join(" ");

    if (!text || text.trim().length === 0) {
      this.success = false;
      return "❌ Gabe says: Give me some text to mock, genius.";
    }

    // Convert to sPoNgEbOb MoCkInG tExT
    let mockedText = "";
    let shouldCapitalize = false;

    for (const char of text) {
      if (char.match(/[a-zA-Z]/)) {
        mockedText += shouldCapitalize ? char.toUpperCase() : char.toLowerCase();
        shouldCapitalize = !shouldCapitalize;
      } else {
        mockedText += char;
      }
    }

    this.success = true;
    return mockedText;
  }

  static flags = [
    {
      name: "text",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The text to mock",
      required: true,
      classic: true,
    },
  ];

  static description = "cOnVeRtS tExT tO mOcKiNg SpOnGeBoB fOrMaT";
  static aliases = ["spongebob", "mocking"];
}

export default MockCommand;
