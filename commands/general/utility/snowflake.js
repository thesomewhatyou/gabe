import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class SnowflakeCommand extends Command {
  async run() {
    this.success = false;
    if (!this.args[0]) return this.getString("commands.responses.snowflake.noInput");
    if (!this.args[0].match(/^<?[@#]?[&!]?\d+>?$/)) return this.getString("commands.responses.snowflake.invalid");
    const snowflake = this.args[0].replace(/[<@#!&>]/g, "");
    if (BigInt(snowflake) < 21154535154122752n) {
      return this.getString("commands.responses.snowflake.invalid");
    }
    const id = ((BigInt(snowflake) >> 22n) + 1420070400000n) / 1000n;
    this.success = true;
    return `<t:${id}:F>`;
  }

  static description = "Converts a Discord snowflake id into a timestamp";
  static aliases = ["timestamp", "snowstamp", "snow"];
  static flags = [
    {
      name: "id",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "A snowflake ID",
      classic: true,
    },
  ];
  static slashAllowed = false;
}

export default SnowflakeCommand;
