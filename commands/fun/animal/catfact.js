import Command from "#cmd-classes/command.js";

class CatFactCommand extends Command {
  async run() {
    await this.acknowledge();
    try {
      const res = await fetch("https://catfact.ninja/fact");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return `🐱 **Cat Fact:** ${data.fact}`;
    } catch (e) {
      this.success = false;
      return "I couldn't get a cat fact. The cats are being secretive.";
    }
  }

  static description = "Gets a random cat fact";
  static aliases = ["cf", "catfacts"];
}

export default CatFactCommand;
