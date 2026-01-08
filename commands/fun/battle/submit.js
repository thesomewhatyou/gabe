import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BattleSubmitCommand extends Command {
  async run() {
    if (!this.database) {
      return this.getString("commands.responses.battle.noDatabase");
    }

    // Get active battle
    const battle = await this.database.getActiveBattle(this.guild?.id ?? "");
    if (!battle) {
      return this.getString("commands.responses.battle.noBattle");
    }

    if (battle.status !== "submissions") {
      return this.getString("commands.responses.battle.submissionsClosed");
    }

    // Check if submission period has ended
    const submissionEnd = new Date(battle.submission_end);
    if (Date.now() > submissionEnd.getTime()) {
      return this.getString("commands.responses.battle.submissionsClosed");
    }

    // Get image URL
    let imageUrl = this.getOptionString("image");

    // Check for attachment
    const attachment = this.getOptionAttachment("file");
    if (attachment) {
      if (!attachment.contentType?.startsWith("image/")) {
        return this.getString("commands.responses.battle.notImage");
      }
      imageUrl = attachment.url;
    }

    // Check message attachments (for classic commands)
    if (!imageUrl && this.message?.attachments.size) {
      const msgAttachment = this.message.attachments.first();
      if (msgAttachment?.contentType?.startsWith("image/")) {
        imageUrl = msgAttachment.url;
      }
    }

    if (!imageUrl) {
      return this.getString("commands.responses.battle.noSubmission");
    }

    // Check if user already submitted
    const existingSubmission = await this.database.getSubmission(battle.id, this.author.id);

    // Add/update submission
    await this.database.addSubmission(battle.id, this.author.id, imageUrl);

    this.success = true;

    if (existingSubmission) {
      return {
        content: "✅ Your submission has been updated!",
        embeds: [
          {
            title: "Updated Submission",
            description: `**Battle Theme:** ${battle.theme}`,
            image: { url: imageUrl },
            color: 0x2ecc71,
            footer: {
              text: `Battle #${battle.id}`,
            },
          },
        ],
        flags: 64, // Ephemeral
      };
    }

    return {
      content: "✅ Your submission has been received!",
      embeds: [
        {
          title: "Submission Received",
          description: `**Battle Theme:** ${battle.theme}\n\nGood luck! 🍀`,
          image: { url: imageUrl },
          color: 0x2ecc71,
          footer: {
            text: `Battle #${battle.id}`,
          },
        },
      ],
      flags: 64, // Ephemeral
    };
  }

  static flags = [
    {
      name: "image",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "URL of your edited image",
    },
    {
      name: "file",
      type: Constants.ApplicationCommandOptionTypes.ATTACHMENT,
      description: "Upload your edited image",
    },
  ];

  static description = "Submit an image to the current battle";
  static aliases = ["battlesubmit", "entry"];
  static dbRequired = true;
}

export default BattleSubmitCommand;
