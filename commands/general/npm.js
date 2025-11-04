import { Constants } from 'oceanic.js';
import Command from '#cmd-classes/command.js';

function formatDate(dateString) {
  if (!dateString) {
    return 'Unknown';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toISOString().split('T')[0];
}

class NpmCommand extends Command {
  async run() {
    this.success = false;
    let pkgName = this.getOptionString("package");
    const org = this.getOptionString("organization");
    
    if (!pkgName) {
      if (this.args[0]?.startsWith('@') && this.args[1]) {
        pkgName = `${this.args[0]}/${this.args[1]}`;
      } else {
        pkgName = this.args[0];
      }
    }

    if (org && pkgName && !pkgName.startsWith('@')) {
      pkgName = `@${org}/${pkgName}`;
    }

    if (!pkgName) {
      await this.interaction.editOriginal({ content: 'Please provide a package name to search for.' });
      return;
    }

    try {


      const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`);
      
      if (response.status === 404) {
        await this.interaction.editOriginal({ content: `Package **${pkgName}** was not found on npm.` });
        return;
      }
      
      if (!response.ok) {
        throw new Error(`npm registry request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      const latestVersion = data?.['dist-tags']?.latest;
      
      if (!latestVersion) {
        await this.interaction.editOriginal({ content: `Could not determine the latest version for **${pkgName}**.` });
        return;
      }
      
      const latestMetadata = data.versions?.[latestVersion] ?? {};
      const { description = 'No description provided.', homepage, repository } = latestMetadata;
      const author = latestMetadata.author?.name || latestMetadata._npmUser?.name || 'Unknown';
      const publishedDate = formatDate(data.time?.[latestVersion]);
      
      const embed = {
        title: `${pkgName}@${latestVersion}`,
        url: `https://www.npmjs.com/package/${encodeURIComponent(pkgName)}`,
        description: description,
        fields: [
          { name: 'Author', value: author, inline: true },
          { name: 'Published', value: publishedDate, inline: true },
        ],
      };

      if (homepage) {
        embed.fields.push({ name: 'Homepage', value: homepage });
      }
      if (repository?.url) {
        embed.fields.push({ name: 'Repository', value: repository.url.replace(/^git\+/, '') });
      }

      this.success = true;
      await this.interaction.editOriginal({ embeds: [embed] });
    } catch (error) {
      console.error('npm lookup failed:', error);
      await this.interaction.editOriginal({ content: 'Unable to contact the npm registry right now.' });
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
    {
      name: "organization",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "The npm organization (optional, e.g., 'org' for @org/package)",
      required: false,
      classic: true,
    },
  ];
}

export default NpmCommand;
