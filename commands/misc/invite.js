import Command from "#cmd-classes/command.js";

class InviteCommand extends Command {
  async run() {
    if (!this.permissions.has("EMBED_LINKS")) {
      this.success = false;
      return this.getString("permissions.noEmbedLinks");
    }

    await this.acknowledge();

    const applicationId = this.client.application?.id ?? this.client.user?.id;
    if (!applicationId) {
      this.success = false;
      return this.getString("commands.responses.invite.noApplication");
    }

    const buildUrl = (permissions) => {
      const url = new URL("https://discord.com/api/oauth2/authorize");
      url.searchParams.set("client_id", applicationId);
      url.searchParams.set("scope", "bot applications.commands");
      if (permissions !== undefined) url.searchParams.set("permissions", permissions);
      return url.toString();
    };

    const links = [];
    const seen = new Set();
    const addLink = (label, permissions) => {
      const inviteUrl = buildUrl(permissions);
      if (seen.has(inviteUrl)) return;
      seen.add(inviteUrl);
      links.push(`• [${label}](${inviteUrl})`);
    };

    if (process.env.INVITE_PERMISSIONS && process.env.INVITE_PERMISSIONS !== "") {
      addLink(this.getString("commands.responses.invite.recommendedLabel"), process.env.INVITE_PERMISSIONS);
    }

    addLink(this.getString("commands.responses.invite.defaultLabel"), "0");
    addLink(this.getString("commands.responses.invite.adminLabel"), "8");

    return {
      embeds: [
        {
          color: 0xff0000,
          title: this.getString("commands.responses.invite.title"),
          description: `${this.getString("commands.responses.invite.description")}\n\n${links.join("\n")}`,
          footer: {
            text: this.getString("commands.responses.invite.footer"),
          },
        },
      ],
    };
  }

  static description = "Generate quick OAuth invite links for Gabe";
  static aliases = ["link", "oauth", "add"];
}

export default InviteCommand;
