import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class BasedCommand extends Command {
  static description = "Check someone's based/cringe ratio (Gabe's opinion tracker)";
  static aliases = ["basedcount", "cringe", "basedcringe"];
  static dbRequired = true;

  static flags = [
    {
      name: "user",
      type: Constants.ApplicationCommandOptionTypes.USER,
      description: "User to check based count for (defaults to you)",
      classic: true,
    },
    {
      name: "action",
      type: Constants.ApplicationCommandOptionTypes.STRING,
      description: "Mark user as based or cringe (admin only)",
      choices: [
        { name: "Mark as Based", value: "based" },
        { name: "Mark as Cringe", value: "cringe" },
      ],
    },
  ];

  async getBasedData(userId, guildId) {
    // Get based/cringe counts from database
    const data = await this.database.run("SELECT * FROM based WHERE user_id = $1 AND guild_id = $2", [userId, guildId]);

    if (!data || !data.rows || data.rows.length === 0) {
      return { based: 0, cringe: 0 };
    }

    return {
      based: data.rows[0].based_count || 0,
      cringe: data.rows[0].cringe_count || 0,
    };
  }

  async updateBasedData(userId, guildId, type) {
    const column = type === "based" ? "based_count" : "cringe_count";

    // Check if record exists
    const existing = await this.database.run("SELECT * FROM based WHERE user_id = $1 AND guild_id = $2", [
      userId,
      guildId,
    ]);

    if (!existing || !existing.rows || existing.rows.length === 0) {
      // Create new record
      await this.database.run(`INSERT INTO based (user_id, guild_id, ${column}) VALUES ($1, $2, 1)`, [userId, guildId]);
    } else {
      // Update existing record
      await this.database.run(`UPDATE based SET ${column} = ${column} + 1 WHERE user_id = $1 AND guild_id = $2`, [
        userId,
        guildId,
      ]);
    }
  }

  async ensureTableExists() {
    // Create table if it doesn't exist
    try {
      await this.database.run(`
        CREATE TABLE IF NOT EXISTS based (
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          based_count INTEGER DEFAULT 0,
          cringe_count INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, guild_id)
        )
      `);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Table might already exist, that's fine
    }
  }

  async run() {
    if (!this.guild) {
      return "❌ Gabe says: Based/cringe tracking only works in servers, not DMs.";
    }

    await this.ensureTableExists();

    const action = this.options.action ?? this.args[0];
    const user = this.getOptionUser("user");
    const target = user ?? this.author;

    // Admin action: mark someone as based or cringe
    if (action === "based" || action === "cringe") {
      // Check if user has admin permissions
      if (!this.memberPermissions?.has("MANAGE_MESSAGES")) {
        return "❌ Gabe says: Only people with Manage Messages permission can mark others. Democracy failed.";
      }

      if (target.id === this.client.user.id) {
        return "🤖 Gabe says: I'm infinitely based. No need to track it.";
      }

      await this.updateBasedData(target.id, this.guild.id, action);
      const data = await this.getBasedData(target.id, this.guild.id);

      return `✅ <@${target.id}> has been marked as **${action}**!
📊 New Stats - Based: ${data.based} | Cringe: ${data.cringe}`;
    }

    // Normal usage: check based/cringe stats
    if (target.id === this.client.user.id) {
      return `🤖 **Gabe's Based Stats**
📊 Based Count: ∞
😬 Cringe Count: 0
📈 Based/Cringe Ratio: Undefined (too based to calculate)

*I'm a bot. I'm automatically based.*`;
    }

    const data = await this.getBasedData(target.id, this.guild.id);
    const isAuthor = target.id === this.author.id;
    const subject = isAuthor ? "Your" : `<@${target.id}>'s`;

    // Calculate ratio
    let ratio = 0;
    if (data.cringe === 0 && data.based > 0) {
      ratio = Infinity;
    } else if (data.based === 0 && data.cringe > 0) {
      ratio = 0;
    } else if (data.based > 0 && data.cringe > 0) {
      ratio = (data.based / data.cringe).toFixed(2);
    }

    // Generate verdict
    let verdict = "";
    let emoji = "📊";

    if (data.based === 0 && data.cringe === 0) {
      verdict = "No data yet. Completely neutral. Boring.";
      emoji = "😐";
    } else if (ratio === Infinity) {
      verdict = "INFINITELY BASED! Not a single cringe moment detected!";
      emoji = "👑";
    } else if (ratio === 0) {
      verdict = "Pure cringe. Zero based moments. Yikes.";
      emoji = "💀";
    } else if (ratio > 10) {
      verdict = "Extremely based! Gabe approves!";
      emoji = "✨";
    } else if (ratio > 3) {
      verdict = "Pretty based overall. Solid vibes.";
      emoji = "👍";
    } else if (ratio > 1) {
      verdict = "Slightly more based than cringe. Keep it up.";
      emoji = "🤷";
    } else if (ratio === 1) {
      verdict = "Perfectly balanced. As all things should be.";
      emoji = "⚖️";
    } else if (ratio > 0.3) {
      verdict = "More cringe than based. Room for improvement.";
      emoji = "😬";
    } else {
      verdict = "Extremely cringe territory. Touch grass maybe?";
      emoji = "💀";
    }

    const ratioDisplay = ratio === Infinity ? "∞" : ratio === 0 ? "0" : ratio;

    return `${emoji} **${subject} Based/Cringe Stats**
📊 Based Count: ${data.based}
😬 Cringe Count: ${data.cringe}
📈 Based/Cringe Ratio: ${ratioDisplay}

*Gabe's Verdict:* ${verdict}`;
  }
}

export default BasedCommand;
