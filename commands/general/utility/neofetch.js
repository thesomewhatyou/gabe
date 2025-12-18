import { freemem, totalmem, cpus, hostname, platform, release, arch, uptime as osUptime, loadavg } from "node:os";
import process from "node:process";
import Command from "#cmd-classes/command.js";

class NeofetchCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }

    await this.acknowledge();

    // System Information
    const osName = platform();
    const osRelease = release();
    const architecture = arch();
    const host = hostname();

    // Memory
    const totalMemMB = Math.round(totalmem() / 1024 / 1024);
    const freeMemMB = Math.round(freemem() / 1024 / 1024);
    const usedMemMB = totalMemMB - freeMemMB;
    const memPercent = ((usedMemMB / totalMemMB) * 100).toFixed(1);

    // CPU
    const cpuInfo = cpus();
    const cpuModel = cpuInfo[0]?.model ?? "Unknown";
    const cpuCores = cpuInfo.length;
    const loadAverage = loadavg();
    const load1m = loadAverage[0]?.toFixed(2) ?? "N/A";
    const load5m = loadAverage[1]?.toFixed(2) ?? "N/A";
    const load15m = loadAverage[2]?.toFixed(2) ?? "N/A";

    // Uptime
    const systemUptimeSec = osUptime();
    const processUptimeSec = process.uptime();

    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
      return parts.join(" ");
    };

    // Node.js / Runtime info
    const nodeVersion = process.version;
    const runtime = process.isBun ? "Bun" : process.versions.deno ? "Deno" : "Node.js";
    const runtimeVersion = process.isBun ? process.versions.bun : (process.versions.deno ?? nodeVersion);

    // Build the neofetch-style ASCII art and info
    const asciiArt = [
      "       _,met$$$$$gg.          ",
      "    ,g$$$$$$$$$$$$$$$P.       ",
      '  ,g$$P"     """Y$$.".        ',
      " ,$$P'              `$$.      ",
      "',$$P       ,ggs.     `$$b:   ",
      "`d$$'     ,$P\"'   .    $$$    ",
      " $$P      d$'     ,    $$P    ",
      " $$:      $$.   -    ,d$$'    ",
      " $$;      Y$b._   _,d$P'      ",
      ' Y$$.    `.`"Y$$$$P"\'         ',
      ' `$$b      "-.__              ',
      "  `Y$$                        ",
      "   `Y$$.                      ",
      "     `$$b.                    ",
      "       `Y$$b.                 ",
      '          `"Y$b._             ',
      '              `"""            ',
    ];

    return {
      embeds: [
        {
          color: 0xd70a53,
          description: `\`\`\`\n${asciiArt.join("\n")}\n\`\`\``,
          fields: [
            {
              name: `${this.author.username}@${host}`,
              value: [
                `**OS**: ${osName} ${osRelease} ${architecture}`,
                `**Host**: ${host}`,
                `**Uptime**: ${formatUptime(systemUptimeSec)}`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "CPU",
              value: [
                `**Model**: ${cpuModel}`,
                `**Cores**: ${cpuCores}`,
                `**Load**: ${load1m}, ${load5m}, ${load15m}`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "Memory",
              value: [`**Used**: ${usedMemMB} MiB / ${totalMemMB} MiB`, `**Usage**: ${memPercent}%`].join("\n"),
              inline: true,
            },
            {
              name: "Runtime",
              value: [
                `**Engine**: ${runtime} ${runtimeVersion}`,
                `**Bot Uptime**: ${formatUptime(processUptimeSec)}`,
              ].join("\n"),
              inline: true,
            },
          ],
          footer: {
            text: "🟥🟧🟨🟩🟦🟪⬛⬜",
          },
        },
      ],
    };
  }

  static description = "Display system information in neofetch style";
  static aliases = ["sysinfo", "systeminfo", "fetch"];
}

export default NeofetchCommand;
