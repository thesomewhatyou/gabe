import Command from "#cmd-classes/command.js";

class JokeCommand extends Command {
  async run() {
    await this.acknowledge();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);
    try {
      const data = await fetch("https://v2.jokeapi.dev/joke/Any?safe-mode", {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await data.json();
      if (json.type === "twopart") {
        return `${json.setup}\n\n${json.delivery}`;
      }
      return json.joke;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        this.success = false;
        return this.getString("commands.responses.joke.error");
      }
    }
  }

  static description = "Gets a random joke";
  static aliases = ["jokes", "funny"];
}

export default JokeCommand;
