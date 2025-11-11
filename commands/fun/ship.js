import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { mentionToObject } from "#utils/mentions.js";

class ShipCommand extends Command {
  static tiers = [
    { max: 25, key: "fizzle" },
    { max: 50, key: "warm" },
    { max: 75, key: "glow" },
    { max: 90, key: "blaze" },
    { max: 100, key: "destiny" },
  ];

  static defaultTierMessages = {
    fizzle: "Uh oh... the sparks aren't flying yet. Maybe just friends?",
    warm: "There's a decent vibe here! A little spark never hurt anyone.",
    glow: "These two are glowing together—this could get serious!",
    blaze: "Now that's chemistry! Gabe ships it hard!",
    destiny: "Soulmate alert! Gabe is already planning the wedding.",
  };

  static description = "Find out how compatible two people are (Gabe's love calculator)";

  static flags = [
    {
      name: "user1",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The first person to ship (defaults to you or the first mention)",
      classic: true,
    },
    {
      name: "user2",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "The second person to ship (defaults to the mentioned user)",
      classic: true,
    },
  ];

  static toUser(entity) {
    if (!entity) return undefined;
    return entity.user ?? entity;
  }

  static getDisplayName(user) {
    return (user.globalName ?? user.username ?? "").trim();
  }

  static sanitizeName(name) {
    return name.replace(/[^\p{L}\p{N}]/gu, "");
  }

  static makePortmanteau(nameA, nameB) {
    const cleanA = ShipCommand.sanitizeName(nameA);
    const cleanB = ShipCommand.sanitizeName(nameB);
    if (!cleanA || !cleanB) return null;

    const firstHalf = cleanA.slice(0, Math.ceil(cleanA.length / 2));
    const secondHalf = cleanB.slice(Math.floor(cleanB.length / 2));
    const combined = `${firstHalf}${secondHalf}`;

    if (combined.length < 2) return null;

    return combined[0].toUpperCase() + combined.slice(1);
  }

  static getCompatibilityScore(idA, idB) {
    const [a, b] = [idA, idB].sort();
    const pair = `${a}:${b}`;
    let hash = 0;

    for (let i = 0; i < pair.length; i += 1) {
      hash = (hash * 31 + pair.charCodeAt(i)) % 2147483647;
    }

    return hash % 101;
  }

  async resolveUserInput(input) {
    if (!input) return undefined;

    const result = await mentionToObject(this.client, input, "user", {
      guild: this.guild ?? undefined,
    }).catch(() => undefined);

    if (!result) return undefined;

    return ShipCommand.toUser(result);
  }

  async run() {
    const optionUser1 = ShipCommand.toUser(this.getOptionUser("user1"));
    const optionUser2 = ShipCommand.toUser(this.getOptionUser("user2"));
    const rawUser1 = typeof this.options?.user1 === "string" ? this.options.user1 : undefined;
    const rawUser2 = typeof this.options?.user2 === "string" ? this.options.user2 : undefined;

    let user1 = optionUser1 ?? (rawUser1 ? await this.resolveUserInput(rawUser1) : undefined);
    let user2 = optionUser2 ?? (rawUser2 ? await this.resolveUserInput(rawUser2) : undefined);

    const mentionTargets = [];
    const seenMentions = new Set();

    if (this.type === "classic" && this.message?.mentions) {
      const members = this.message.mentions.members;
      if (members?.size) {
        for (const member of members.values()) {
          const mentionUser = ShipCommand.toUser(member);
          if (mentionUser && !seenMentions.has(mentionUser.id)) {
            seenMentions.add(mentionUser.id);
            mentionTargets.push(mentionUser);
          }
        }
      }

      const users = this.message.mentions.users;
      if (users?.size) {
        for (const mention of users.values()) {
          if (!seenMentions.has(mention.id)) {
            seenMentions.add(mention.id);
            mentionTargets.push(mention);
          }
        }
      }
    }

    if (!mentionTargets.length && this.type === "classic" && this.args.length) {
      for (const arg of this.args) {
        if (!arg) continue;
        const resolved = await this.resolveUserInput(arg);
        if (resolved && !seenMentions.has(resolved.id)) {
          seenMentions.add(resolved.id);
          mentionTargets.push(resolved);
        }
        if (mentionTargets.length >= 2) break;
      }
    }

    if (!user1) {
      if (mentionTargets.length > 1) {
        user1 = mentionTargets.shift();
      } else {
        user1 = this.author;
      }
    }

    if (!user2 && mentionTargets.length) {
      user2 = mentionTargets.shift();
    }

    if (!user2 && user1 && user1.id !== this.author.id) {
      user2 = this.author;
    }

    if (!user1 || !user2) {
      return "❌ Gabe says: I need two people to ship! Try tagging them or using the flags.";
    }

    const compatibility = ShipCommand.getCompatibilityScore(user1.id, user2.id);
    let tier = ShipCommand.tiers.find((entry) => compatibility <= entry.max);
    if (!tier) {
      tier = ShipCommand.tiers[ShipCommand.tiers.length - 1];
    }
    const tierMessage =
      this.getString(`commands.responses.ship.${tier.key}`, { returnNull: true }) ??
      ShipCommand.defaultTierMessages[tier.key];

    const displayName1 = ShipCommand.getDisplayName(user1);
    const displayName2 = ShipCommand.getDisplayName(user2);
    const shipName =
      displayName1 && displayName2
        ? ShipCommand.makePortmanteau(displayName1, displayName2)
        : null;

    const lines = [
      "💘 **Gabe's Compatibility Report**",
      `${user1.id === this.author.id ? "You" : `<@${user1.id}>`} ❤ ${user2.id === this.author.id ? "You" : `<@${user2.id}>`}`,
      `**Compatibility:** ${compatibility}%`,
      tierMessage,
    ];

    if (shipName) {
      lines.push(`**Ship Name:** ${shipName}`);
    }

    return lines.join("\n");
  }
}

export default ShipCommand;
