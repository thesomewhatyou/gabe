import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class NpmCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }

    const pkgArg = this.getOptionString("package") ?? this.args[0];
    const orgArgRaw = this.getOptionString("org") ?? this.args[1];
    if (!pkgArg || !pkgArg.trim()) {
      this.success = false;
      return "Please provide a package name.";
    }

    let name = pkgArg.trim();
    if (orgArgRaw && !name.startsWith("@")) {
      const scope = orgArgRaw.replace(/^@/, "").trim();
      if (scope) name = `@${scope}/${name}`;
    }

    const encoded = encodeURIComponent(name);
    await this.acknowledge();

    let data;
    try {
      const res = await fetch(`https://registry.npmjs.org/${encoded}`, {
        headers: { accept: "application/vnd.npm.install-v1+json" },
      });
      if (!res.ok) {
        this.success = false;
        return `Package not found: ${name}`;
      }
      data = await res.json();
    } catch {
      this.success = false;
      return "Failed to contact npm registry.";
    }

    const latest = data["dist-tags"]?.latest;
    const version = latest && data.versions?.[latest] ? latest : Object.keys(data.versions || {}).pop();
    const verMeta = version ? data.versions[version] : null;
    const time = data.time?.[version] ?? data.time?.created;

    const author =
      (verMeta?.author && (typeof verMeta.author === "string" ? verMeta.author : verMeta.author.name)) ||
      (Array.isArray(verMeta?.maintainers)
        ? verMeta.maintainers
            .map((m) => (typeof m === "string" ? m : m.name))
            .slice(0, 3)
            .join(", ")
        : undefined);

    let repo = verMeta?.repository?.url || verMeta?.repository || data.repository?.url || data.repository;
    if (typeof repo === "string") {
      repo = repo.replace(/^git\+/, "").replace(/\.git$/, "");
    } else if (repo?.url) {
      repo = String(repo.url)
        .replace(/^git\+/, "")
        .replace(/\.git$/, "");
    } else {
      repo = undefined;
    }

    const homepage = verMeta?.homepage;
    const keywords = Array.isArray(verMeta?.keywords) ? verMeta.keywords.slice(0, 10).join(", ") : undefined;

    const fields = [];
    fields.push({ name: "Version", value: version ?? "N/A", inline: true });
    fields.push({ name: "License", value: verMeta?.license || data.license || "N/A", inline: true });
    if (author) fields.push({ name: "Author", value: author, inline: true });
    if (time) fields.push({ name: "Published", value: new Date(time).toISOString(), inline: true });
    if (keywords) fields.push({ name: "Keywords", value: keywords });
    if (repo) fields.push({ name: "Repository", value: repo });
    if (homepage) fields.push({ name: "Homepage", value: homepage });

    this.success = true;
    return {
      embeds: [
        {
          author: { name: "npm Package Lookup", iconURL: this.client.user.avatarURL() },
          title: `${data.name ?? name}`,
          url: `https://www.npmjs.com/package/${encodeURIComponent(name)}`.replace(/%2F/g, "/"),
          description: verMeta?.description || data.description || "No description.",
          color: 0xff0000,
          fields,
        },
      ],
    };
  }

  static description = "Looks up packages from the npm registry";
  static aliases = ["npm", "npminfo", "pkg"];
  static flags = [
    {
      name: "package",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The package name (e.g., express or @scope/name)",
      classic: true,
      required: true,
    },
    {
      name: "org",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Optional organization/scope (without @)",
      classic: true,
    },
  ];
}

export default NpmCommand;
