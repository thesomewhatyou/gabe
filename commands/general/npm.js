import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class NpmCommand extends Command {
  async run() {
    this.success = false;
    if (!this.args[0]) return "Please provide a package name to search for.";

    const packageName = this.args[0];

    try {
      const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return `Package "${packageName}" not found on npm.`;
        }
        return `Failed to fetch package information (Status: ${response.status})`;
      }

      const data = await response.json();
      
      const latestVersion = data["dist-tags"]?.latest || "Unknown";
      const repository = data.repository?.url || data.repository || "No repository";
      const cleanRepo = typeof repository === "string" 
        ? repository.replace(/^git\+/, "").replace(/\.git$/, "") 
        : "No repository";
      
      const latestReleaseDate = data.time?.[latestVersion] || "Unknown";
      const formattedDate = latestReleaseDate !== "Unknown" 
        ? new Date(latestReleaseDate).toLocaleDateString("en-US", { 
            year: "numeric", 
            month: "long", 
            day: "numeric" 
          })
        : "Unknown";
      
      const description = data.description || "No description";
      const homepage = data.homepage || cleanRepo;
      const license = data.license || "Unknown";

      this.success = true;
      return `**${packageName}**
\`\`\`
Version:       ${latestVersion}
Released:      ${formattedDate}
License:       ${license}
Repository:    ${cleanRepo}
Homepage:      ${homepage}
Description:   ${description}
\`\`\``;
    } catch (error) {
      return `Error fetching package information: ${error.message}`;
    }
  }

  static description = "Looks up an npm package and returns its information";
  static aliases = ["package", "npminfo"];
  static flags = [
    {
      name: "package",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The npm package name to look up",
      required: true,
      classic: true,
    },
  ];
}

export default NpmCommand;
