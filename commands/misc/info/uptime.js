import process from "node:process";
import Command from "#cmd-classes/command.js";

class UptimeCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }

    await this.acknowledge();

    const uptimeMs = process.uptime() * 1000;
    const connectionMs = this.client.uptime ?? 0;

    const formatDuration = (ms) => {
      const safeMs = Number.isFinite(ms) ? Math.max(ms, 0) : 0;
      return this.getString("timeFormat", {
        params: {
          days: Math.trunc(safeMs / 86400000).toString(),
          hours: (Math.trunc(safeMs / 3600000) % 24).toString(),
          minutes: (Math.trunc(safeMs / 60000) % 60).toString(),
          seconds: (Math.trunc(safeMs / 1000) % 60).toString(),
        },
      });
    };

    const processTimestamp = Math.floor((Date.now() - uptimeMs) / 1000);
    const connectionTimestamp = connectionMs > 0 ? Math.floor((Date.now() - connectionMs) / 1000) : null;

    return {
      embeds: [
        {
          color: 0xff0000,
          title: this.getString("commands.responses.uptime.title"),
          description: this.getString("commands.responses.uptime.description"),
          fields: [
            {
              name: this.getString("commands.responses.uptime.botUptime"),
              value: formatDuration(uptimeMs),
              inline: true,
            },
            {
              name: this.getString("commands.responses.uptime.connectionUptime"),
              value: formatDuration(connectionMs),
              inline: true,
            },
            {
              name: this.getString("commands.responses.uptime.startedAt"),
              value: `<t:${processTimestamp}:F>\n<t:${processTimestamp}:R>`,
            },
            {
              name: this.getString("commands.responses.uptime.connectedAt"),
              value:
                connectionTimestamp !== null
                  ? `<t:${connectionTimestamp}:F>\n<t:${connectionTimestamp}:R>`
                  : this.getString("commands.responses.uptime.notAvailable"),
            },
          ],
        },
      ],
    };
  }

  static description = "Check how long Gabe's been awake and connected";
  static aliases = ["runtime", "alive"];
}

export default UptimeCommand;
