import Command from "#cmd-classes/command.js";

class YoMamaCommand extends Command {
  async run() {
    try {
      const response = await fetch("https://yomama-jokes.com/api/random");

      if (!response.ok) {
        return "❌ Gabe says: The yo mama joke API is down. Even Gabe can't fix that!";
      }

      const data = await response.json();

      if (!data.joke) {
        return "❌ Gabe says: Got a broken joke from the API. That's embarrassing.";
      }

      return `😂 **YO MAMA JOKE**\n${data.joke}\n\n*Courtesy of Gabe's joke database*`;
    } catch (error) {
      return `❌ Gabe says: Something went wrong fetching the joke. ${error.message}`;
    }
  }

  static description = "Get a random yo mama joke (Gabe's favorite)";
  static aliases = ["yourmom", "yourmama", "urmom"];
}

export default YoMamaCommand;
