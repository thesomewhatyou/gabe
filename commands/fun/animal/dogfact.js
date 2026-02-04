import Command from "#cmd-classes/command.js";

class DogFactCommand extends Command {
  async run() {
    await this.acknowledge();
    try {
      const res = await fetch("https://dogapi.dog/api/v2/facts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return `🐶 **Dog Fact:** ${data.data[0].attributes.body}`;
    } catch (_e) {
      this.success = false;
      return "I couldn't get a dog fact. The dogs are being quiet today.";
    }
  }

  static description = "Gets a random dog fact";
  static aliases = ["df", "dogfacts"];
}

export default DogFactCommand;
