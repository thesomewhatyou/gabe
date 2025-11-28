import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class RoastCommand extends Command {
  static roasts = [
    "you're the human version of a loading spinner that never resolves.",
    "your idea of multitasking is opening Discord on both monitors.",
    "you radiate default notification sound energy.",
    "I've seen crash reports with more confidence than you.",
    "your workflow is 90% undo button and 10% panic.",
    "you're the reason tooltips still exist in 2025.",
    "you clap when Discord reconnects.",
    "autocorrect filed for a restraining order because of you.",
    "your inbox looks like a museum dedicated to procrastination.",
    "you organize playlists by 'vibes' because labeling is hard.",
    "even your shadow buffers before following you.",
    "your best pickup line is 'are you connected to the same Wi-Fi?'",
    "you're proof that copy and paste can go horribly wrong.",
    'your aura screams "forgot to unmute".',
  ];

  static mentionRegex = /^<@!?(\d{17,21})>$/;

  static flags = [
    {
      name: "target",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "Who should Gabe roast? (defaults to you or the first mention)",
      classic: true,
    },
  ];

  static description = "Let Gabe unleash a sarcastic roast on someone";
  static aliases = ["burn", "insult", "callout"];

  static toUser(entity) {
    if (!entity) return undefined;
    return entity.user ?? entity;
  }

  static parseUserID(token) {
    if (!token || typeof token !== "string") return undefined;
    const mention = token.match(RoastCommand.mentionRegex);
    if (mention) return mention[1];
    if (/^\d{17,21}$/.test(token)) return token;
    return undefined;
  }

  async fetchUser(id) {
    if (!id) return undefined;
    const cached =
      this.client.users.get(id) ??
      this.guild?.members.get(id)?.user ??
      (await this.client.rest.users.get(id).catch(() => undefined));
    return cached ?? undefined;
  }

  async resolveMentionTarget() {
    if (!this.message?.mentions) return undefined;

    if (this.message.mentions.members?.size) {
      for (const member of this.message.mentions.members.values()) {
        const user = RoastCommand.toUser(member);
        if (user) return user;
        break;
      }
    }

    if (this.message.mentions.users?.size) {
      for (const user of this.message.mentions.users.values()) {
        if (user) return user;
        break;
      }
    }

    return undefined;
  }

  async resolveClassicTarget() {
    const mentionTarget = await this.resolveMentionTarget();
    if (mentionTarget) return mentionTarget;

    const attempts = [];

    const optionTarget = this.options?.target;
    if (typeof optionTarget === "string") attempts.push(optionTarget);

    if (this.args?.length) {
      attempts.push(...this.args);
    }

    for (const token of attempts) {
      const id = RoastCommand.parseUserID(token);
      if (!id) continue;
      const user = await this.fetchUser(id);
      if (user) return user;
    }

    return undefined;
  }

  async resolveTarget() {
    const slashUser = this.getOptionUser("target");
    if (slashUser) return slashUser;

    if (this.type === "classic") {
      const classic = await this.resolveClassicTarget();
      if (classic) return classic;
    }

    return this.author;
  }

  async run() {
    const target = await this.resolveTarget();
    if (!target) {
      return "❌ Gabe says: I can't find anyone to roast. Mention someone, coward.";
    }

    if (target.id === this.client.user.id) {
      return "🤖 Nice try, but I'm already running on 100% self-roasted firmware.";
    }

    const subject = target.id === this.author.id ? "You" : `<@${target.id}>`;
    const roast = random(RoastCommand.roasts);

    return `🔥 **Gabe's Roast Generator**\n${subject}, ${roast}`;
  }
}

export default RoastCommand;
