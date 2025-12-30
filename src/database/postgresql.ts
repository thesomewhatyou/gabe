import process from "node:process";
import type { Guild, GuildChannel } from "oceanic.js";
import Postgres from "postgres";
import {
  commands,
  disabledCache,
  disabledCmdCache,
  messageCommands,
  prefixCache,
  userCommands,
} from "#utils/collections.js";
import logger from "#utils/logger.js";
import type { Count, DBGuild, StarboardEntry, StarboardSettings, Tag } from "#utils/types.js";
import type { DatabasePlugin } from "../database.ts";

interface Settings {
  id: number;
  version: number;
  broadcast?: string;
}

const settingsSchema = `
CREATE TABLE IF NOT EXISTS settings (
  id smallint PRIMARY KEY,
  version integer NOT NULL, CHECK(id = 1)
);
`;

const schema = `
ALTER TABLE settings ADD COLUMN broadcast text;
CREATE TABLE guilds (
  guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
  prefix VARCHAR(15) NOT NULL,
  disabled text ARRAY NOT NULL,
  disabled_commands text ARRAY NOT NULL,
  tag_roles VARCHAR(30) ARRAY DEFAULT array[]::varchar[] NOT NULL
);
CREATE TABLE counts (
  command VARCHAR NOT NULL PRIMARY KEY,
  count integer NOT NULL
);
CREATE TABLE tags (
  guild_id VARCHAR(30) NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  author VARCHAR(30) NOT NULL,
  UNIQUE(guild_id, name)
);
CREATE TABLE starboard_settings (
  guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
  channel_id VARCHAR(30),
  emoji VARCHAR(64) NOT NULL DEFAULT '⭐',
  threshold INTEGER NOT NULL DEFAULT 3,
  allow_self BOOLEAN NOT NULL DEFAULT FALSE,
  allow_bots BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE starboard_messages (
  guild_id VARCHAR(30) NOT NULL,
  message_id VARCHAR(30) NOT NULL,
  channel_id VARCHAR(30) NOT NULL,
  starboard_message_id VARCHAR(30),
  star_count INTEGER NOT NULL DEFAULT 0,
  author_id VARCHAR(30) NOT NULL,
  PRIMARY KEY (guild_id, message_id)
);
CREATE INDEX starboard_messages_guild_idx ON starboard_messages (guild_id);
`;

const updates = [
  "", // reserved
  "CREATE TABLE IF NOT EXISTS settings ( id smallint PRIMARY KEY, version integer NOT NULL, CHECK(id = 1) );\nALTER TABLE guilds ADD COLUMN accessed timestamp;",
  "ALTER TABLE guilds DROP COLUMN accessed",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS broadcast text",
  "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS tag_roles VARCHAR(30) ARRAY DEFAULT array[]::varchar[] NOT NULL",
  `WITH cmds AS (
     SELECT sum("count") AS amount FROM counts WHERE command IN ('qrcreate', 'qrread', 'qr')
  ) INSERT INTO counts ("command", "count") VALUES ('qr', (SELECT amount FROM cmds))
  ON CONFLICT ("command") DO UPDATE SET "count" = (SELECT amount FROM cmds);
  WITH cmds AS (
    SELECT sum("count") AS amount FROM counts WHERE command IN (
      '9gag', 'avs4you', 'bandicam', 'deviantart', 'funky',
		  'hypercam', 'ifunny', 'kinemaster', 'memecenter',
		  'powerdirector', 'shutterstock', 'watermark'
    )
  ) INSERT INTO counts ("command", "count") VALUES ('watermark', (SELECT amount FROM cmds))
  ON CONFLICT ("command") DO UPDATE SET "count" = (SELECT amount FROM cmds);`,
  // User preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(30) PRIMARY KEY,
    locale VARCHAR(10),
    dm_notifications BOOLEAN DEFAULT TRUE
  );`,
  // Moderation logs and warnings tables
  `CREATE TABLE IF NOT EXISTS mod_logs (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    moderator_id VARCHAR(30) NOT NULL,
    action VARCHAR(20) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS warnings (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    moderator_id VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_mod_logs_guild_user ON mod_logs(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);`,
  // User levels table for XP/leveling system
  `CREATE TABLE IF NOT EXISTS user_levels (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_xp_gain TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  ALTER TABLE guilds ADD COLUMN IF NOT EXISTS levels_enabled BOOLEAN DEFAULT FALSE;`,
  // Level-up notifications setting
  `ALTER TABLE guilds ADD COLUMN IF NOT EXISTS level_up_notifications BOOLEAN DEFAULT TRUE;`,
  // Starboard tables
  `CREATE TABLE IF NOT EXISTS starboard_settings (
    guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
    channel_id VARCHAR(30),
    emoji VARCHAR(64) NOT NULL DEFAULT '⭐',
    threshold INTEGER NOT NULL DEFAULT 3,
    allow_self BOOLEAN NOT NULL DEFAULT FALSE,
    allow_bots BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS starboard_messages (
    guild_id VARCHAR(30) NOT NULL,
    message_id VARCHAR(30) NOT NULL,
    channel_id VARCHAR(30) NOT NULL,
    starboard_message_id VARCHAR(30),
    star_count INTEGER NOT NULL DEFAULT 0,
    author_id VARCHAR(30) NOT NULL,
    PRIMARY KEY (guild_id, message_id)
  );
  CREATE INDEX IF NOT EXISTS starboard_messages_guild_idx ON starboard_messages (guild_id);`,
  // Economy system tables
  `CREATE TABLE IF NOT EXISTS economy_users (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    balance BIGINT DEFAULT 0,
    last_daily TIMESTAMP,
    last_work TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS economy_holdings (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    amount DOUBLE PRECISION DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, crypto)
  );
  CREATE TABLE IF NOT EXISTS economy_prices (
    guild_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    price DOUBLE PRECISION DEFAULT 100,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, crypto)
  );
  CREATE TABLE IF NOT EXISTS economy_price_history (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_price_history_guild_crypto ON economy_price_history(guild_id, crypto);
  CREATE TABLE IF NOT EXISTS economy_transactions (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    crypto VARCHAR(20),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_guild_user ON economy_transactions(guild_id, user_id);
  CREATE TABLE IF NOT EXISTS economy_settings (
    guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    daily_amount INTEGER DEFAULT 100,
    work_min INTEGER DEFAULT 10,
    work_max INTEGER DEFAULT 50,
    work_cooldown INTEGER DEFAULT 3600,
    daily_cooldown INTEGER DEFAULT 86400
  );`,
];

export default class PostgreSQLPlugin implements DatabasePlugin {
  sql: Postgres.Sql;

  constructor(connectString: string) {
    this.sql = Postgres(connectString, {
      onnotice: () => { },
    });
  }

  async setup() {
    const existingCommands = (await this.sql<{ command: string }[]>`SELECT command FROM counts`).map((x) => x.command);
    const commandNames = [...commands.keys(), ...messageCommands.keys(), ...userCommands.keys()];
    for (const command of commandNames) {
      if (!existingCommands.includes(command)) {
        await this.sql`INSERT INTO counts ${this.sql({ command, count: 0 }, "command", "count")}`;
      }
    }
  }

  async upgrade() {
    try {
      await this.sql.begin(async (sql) => {
        await sql.unsafe(settingsSchema);
        let version: number;
        const [settingsrow]: [Settings?] = await sql`SELECT version FROM settings WHERE id = 1`;
        if (!settingsrow) {
          version = 0;
        } else {
          version = settingsrow.version;
        }
        const latestVersion = updates.length - 1;
        if (version === 0) {
          logger.info("Initializing PostgreSQL database...");
          await sql.unsafe(schema);
        } else if (version < latestVersion) {
          logger.info(`Migrating PostgreSQL database, which is currently at version ${version}...`);
          while (version < latestVersion) {
            version++;
            logger.info(`Running version ${version} update script...`);
            await sql.unsafe(updates[version]);
          }
        } else {
          return;
        }
        await sql`INSERT INTO settings ${sql({ id: 1, version: latestVersion })} ON CONFLICT (id) DO UPDATE SET version = ${latestVersion}`;
      });
    } catch (err) {
      logger.error(`PostgreSQL migration failed: ${(err as Error).stack || err}`);
      logger.error("Unable to start the bot, quitting now.");
      return 1;
    }
  }

  getGuild(query: string): Promise<DBGuild> {
    return new Promise((resolve) => {
      this.sql.begin(async (sql) => {
        let [guild]: [DBGuild?] = await sql`SELECT * FROM guilds WHERE guild_id = ${query}`;
        if (!guild) {
          guild = {
            guild_id: query,
            prefix: process.env.PREFIX ?? "&",
            disabled: [],
            disabled_commands: [],
            tag_roles: [],
          };
          await sql`INSERT INTO guilds ${sql(guild)}`;
        }
        resolve(guild);
      });
    });
  }

  async setPrefix(prefix: string, guild: Guild) {
    await this.sql`UPDATE guilds SET prefix = ${prefix} WHERE guild_id = ${guild.id}`;
    prefixCache.set(guild.id, prefix);
  }

  async getTag(guild: string, tag: string) {
    const [tagResult]: [Tag?] = await this.sql`SELECT * FROM tags WHERE guild_id = ${guild} AND name = ${tag}`;
    return tagResult;
  }

  async getTags(guild: string) {
    const tagArray = await this.sql<Tag[]>`SELECT * FROM tags WHERE guild_id = ${guild}`;
    const tags: Record<string, Tag> = {};
    for (const tag of tagArray) {
      tags[tag.name] = tag;
    }
    return tags;
  }

  async setTag(tag: Tag, guild: Guild) {
    await this
      .sql`INSERT INTO tags ${this.sql({ guild_id: guild.id, name: tag.name, content: tag.content, author: tag.author }, "guild_id", "name", "content", "author")}`;
  }

  async editTag(tag: Tag, guild: Guild) {
    await this
      .sql`UPDATE tags SET content = ${tag.content}, author = ${tag.author} WHERE guild_id = ${guild.id} AND name = ${tag.name}`;
  }

  async removeTag(name: string, guild: Guild) {
    await this.sql`DELETE FROM tags WHERE guild_id = ${guild.id} AND name = ${name}`;
  }

  async addTagRole(guild: string, role: string) {
    const guildDB = await this.getGuild(guild);
    await this.sql`UPDATE guilds SET tag_roles = ${[...guildDB.tag_roles, role]} WHERE guild_id = ${guild}`;
  }

  async removeTagRole(guild: string, role: string) {
    const guildDB = await this.getGuild(guild);
    await this
      .sql`UPDATE guilds SET tag_roles = ${guildDB.tag_roles.filter((v) => v !== role)} WHERE guild_id = ${guild}`;
  }

  async setBroadcast(msg?: string) {
    await this.sql`UPDATE settings SET broadcast = ${msg ?? null} WHERE id = 1`;
  }

  async getBroadcast() {
    const result = await this.sql<Settings[]>`SELECT broadcast FROM settings WHERE id = 1`;
    return result[0].broadcast;
  }

  async disableCommand(guild: string, command: string) {
    const guildDB = await this.getGuild(guild);
    await this
      .sql`UPDATE guilds SET disabled_commands = ${(guildDB.disabled_commands ? [...guildDB.disabled_commands, command] : [command]).filter((v) => !!v)} WHERE guild_id = ${guild}`;
    disabledCmdCache.set(
      guild,
      guildDB.disabled_commands ? [...guildDB.disabled_commands, command] : [command].filter((v) => !!v),
    );
  }

  async enableCommand(guild: string, command: string) {
    const guildDB = await this.getGuild(guild);
    const newDisabled = guildDB.disabled_commands ? guildDB.disabled_commands.filter((item) => item !== command) : [];
    await this.sql`UPDATE guilds SET disabled_commands = ${newDisabled} WHERE guild_id = ${guild}`;
    disabledCmdCache.set(guild, newDisabled);
  }

  async disableChannel(channel: GuildChannel) {
    const guildDB = await this.getGuild(channel.guildID);
    await this
      .sql`UPDATE guilds SET disabled_commands = ${[...guildDB.disabled, channel.id]} WHERE guild_id = ${channel.guildID}`;
    disabledCache.set(channel.guildID, [...guildDB.disabled, channel.id]);
  }

  async enableChannel(channel: GuildChannel) {
    const guildDB = await this.getGuild(channel.guildID);
    const newDisabled = guildDB.disabled.filter((item) => item !== channel.id);
    await this.sql`UPDATE guilds SET disabled_commands = ${newDisabled} WHERE guild_id = ${channel.guildID}`;
    disabledCache.set(channel.guildID, newDisabled);
  }

  async getCounts(all?: boolean) {
    const counts = await this.sql<Count[]>`SELECT * FROM counts`;
    const commandNames = [...commands.keys(), ...messageCommands.keys(), ...userCommands.keys()];
    const countMap = new Map(
      (all ? counts : counts.filter((val) => commandNames.includes(val.command))).map((val) => [
        val.command,
        val.count,
      ]),
    );
    return countMap;
  }

  async addCount(command: string) {
    await this
      .sql`INSERT INTO counts ${this.sql({ command, count: 1 }, "command", "count")} ON CONFLICT (command) DO UPDATE SET count = counts.count + 1 WHERE counts.command = ${command}`;
  }

  async stop() {
    await this.sql.end();
  }

  async getUserPreferences(userId: string) {
    const [result]: [{ user_id: string; locale: string | null; dm_notifications: boolean }?] = await this
      .sql`SELECT * FROM user_preferences WHERE user_id = ${userId}`;

    if (!result) {
      return {
        user_id: userId,
        locale: null,
        dm_notifications: true,
      };
    }

    return {
      user_id: result.user_id,
      locale: result.locale,
      dm_notifications: result.dm_notifications,
    };
  }

  async setUserPreference(userId: string, key: "locale" | "dm_notifications", value: string | boolean | null) {
    const [existing]: [{ user_id: string }?] = await this
      .sql`SELECT user_id FROM user_preferences WHERE user_id = ${userId}`;

    if (existing) {
      if (key === "locale") {
        await this.sql`UPDATE user_preferences SET locale = ${value as string | null} WHERE user_id = ${userId}`;
      } else {
        await this.sql`UPDATE user_preferences SET dm_notifications = ${value as boolean} WHERE user_id = ${userId}`;
      }
    } else {
      const defaults = {
        user_id: userId,
        locale: null as string | null,
        dm_notifications: true,
      };
      if (key === "locale") {
        defaults.locale = value as string | null;
      } else {
        defaults.dm_notifications = value as boolean;
      }
      await this.sql`INSERT INTO user_preferences ${this.sql(defaults, "user_id", "locale", "dm_notifications")}`;
    }
  }

  async addModLog(guildId: string, userId: string, moderatorId: string, action: string, reason?: string) {
    await this
      .sql`INSERT INTO mod_logs (guild_id, user_id, moderator_id, action, reason) VALUES (${guildId}, ${userId}, ${moderatorId}, ${action}, ${reason ?? null})`;
  }

  async getModLogs(guildId: string, userId?: string, limit = 10) {
    if (userId) {
      return await this.sql<
        {
          id: number;
          guild_id: string;
          user_id: string;
          moderator_id: string;
          action: string;
          reason: string | null;
          created_at: Date;
        }[]
      >`
        SELECT * FROM mod_logs WHERE guild_id = ${guildId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
      `;
    }
    return await this.sql<
      {
        id: number;
        guild_id: string;
        user_id: string;
        moderator_id: string;
        action: string;
        reason: string | null;
        created_at: Date;
      }[]
    >`
      SELECT * FROM mod_logs WHERE guild_id = ${guildId} ORDER BY created_at DESC LIMIT ${limit}
    `;
  }

  async addWarning(guildId: string, userId: string, moderatorId: string, reason: string) {
    const [result] = await this.sql<{ id: number }[]>`
      INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (${guildId}, ${userId}, ${moderatorId}, ${reason}) RETURNING id
    `;
    return result.id;
  }

  async getWarnings(guildId: string, userId: string) {
    return await this.sql<
      { id: number; guild_id: string; user_id: string; moderator_id: string; reason: string; created_at: Date }[]
    >`
      SELECT * FROM warnings WHERE guild_id = ${guildId} AND user_id = ${userId} ORDER BY created_at DESC
    `;
  }

  async removeWarning(guildId: string, warningId: number) {
    const result = await this.sql`DELETE FROM warnings WHERE guild_id = ${guildId} AND id = ${warningId}`;
    return result.count > 0;
  }

  async clearWarnings(guildId: string, userId: string) {
    const result = await this.sql`DELETE FROM warnings WHERE guild_id = ${guildId} AND user_id = ${userId}`;
    return result.count;
  }

  async getStarboardSettings(guildId: string) {
    const [result] = await this.sql<StarboardSettings[]>`
      SELECT * FROM starboard_settings WHERE guild_id = ${guildId}
    `;
    if (result) return result;
    return {
      guild_id: guildId,
      channel_id: null,
      emoji: "⭐",
      threshold: 3,
      allow_self: false,
      allow_bots: false,
      enabled: false,
    };
  }

  async setStarboardSettings(settings: StarboardSettings) {
    await this.sql`
      INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold, allow_self, allow_bots, enabled)
      VALUES (${settings.guild_id}, ${settings.channel_id}, ${settings.emoji}, ${settings.threshold}, ${settings.allow_self}, ${settings.allow_bots}, ${settings.enabled})
      ON CONFLICT (guild_id) DO UPDATE SET
        channel_id = EXCLUDED.channel_id,
        emoji = EXCLUDED.emoji,
        threshold = EXCLUDED.threshold,
        allow_self = EXCLUDED.allow_self,
        allow_bots = EXCLUDED.allow_bots,
        enabled = EXCLUDED.enabled
    `;
  }

  async getStarboardEntry(guildId: string, messageId: string) {
    const [result] = await this.sql<StarboardEntry[]>`
      SELECT * FROM starboard_messages WHERE guild_id = ${guildId} AND message_id = ${messageId}
    `;
    return result;
  }

  async upsertStarboardEntry(entry: StarboardEntry) {
    await this.sql`
      INSERT INTO starboard_messages (guild_id, message_id, channel_id, starboard_message_id, star_count, author_id)
      VALUES (${entry.guild_id}, ${entry.message_id}, ${entry.channel_id}, ${entry.starboard_message_id}, ${entry.star_count}, ${entry.author_id})
      ON CONFLICT (guild_id, message_id) DO UPDATE SET
        channel_id = EXCLUDED.channel_id,
        starboard_message_id = EXCLUDED.starboard_message_id,
        star_count = EXCLUDED.star_count,
        author_id = EXCLUDED.author_id
    `;
  }

  async deleteStarboardEntry(guildId: string, messageId: string) {
    await this.sql`DELETE FROM starboard_messages WHERE guild_id = ${guildId} AND message_id = ${messageId}`;
  }

  async pruneStarboardEntries(guildId: string, olderThan: number) {
    void olderThan;
    await this.sql`DELETE FROM starboard_messages WHERE guild_id = ${guildId} AND star_count <= 0`;
  }

  async getUserLevel(guildId: string, userId: string) {
    const [result] = await this.sql<
      { guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: Date | null }[]
    >`
      SELECT * FROM user_levels WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;

    if (!result) {
      return { guild_id: guildId, user_id: userId, xp: 0, level: 0, last_xp_gain: null };
    }
    return result;
  }

  async addXP(guildId: string, userId: string, amount: number) {
    const now = new Date();
    const [existing] = await this.sql<{ xp: number; level: number }[]>`
      SELECT xp, level FROM user_levels WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;

    if (existing) {
      const newXP = existing.xp + amount;
      const newLevel = Math.floor(0.1 * Math.sqrt(newXP));
      const leveledUp = newLevel > existing.level;

      await this.sql`
        UPDATE user_levels SET xp = ${newXP}, level = ${newLevel}, last_xp_gain = ${now}
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;

      return { xp: newXP, level: newLevel, leveledUp };
    } else {
      const newLevel = Math.floor(0.1 * Math.sqrt(amount));
      await this.sql`
        INSERT INTO user_levels (guild_id, user_id, xp, level, last_xp_gain)
        VALUES (${guildId}, ${userId}, ${amount}, ${newLevel}, ${now})
      `;

      return { xp: amount, level: newLevel, leveledUp: newLevel > 0 };
    }
  }

  async getLeaderboard(guildId: string, limit = 10) {
    return await this.sql<
      { guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: Date | null }[]
    >`
      SELECT * FROM user_levels WHERE guild_id = ${guildId} ORDER BY xp DESC LIMIT ${limit}
    `;
  }

  async setLevelsEnabled(guildId: string, enabled: boolean) {
    await this.sql`UPDATE guilds SET levels_enabled = ${enabled} WHERE guild_id = ${guildId}`;
  }

  async isLevelsEnabled(guildId: string) {
    const [result] = await this.sql<{ levels_enabled: boolean }[]>`
      SELECT levels_enabled FROM guilds WHERE guild_id = ${guildId}
    `;
    return result?.levels_enabled === true;
  }

  async setLevelUpNotifications(guildId: string, enabled: boolean) {
    await this.sql`UPDATE guilds SET level_up_notifications = ${enabled} WHERE guild_id = ${guildId}`;
  }

  async isLevelUpNotificationsEnabled(guildId: string) {
    const [result] = await this.sql<{ level_up_notifications: boolean }[]>`
      SELECT level_up_notifications FROM guilds WHERE guild_id = ${guildId}
    `;
    return result?.level_up_notifications !== false; // Default to true if not set
  }

  // ==================== ECONOMY SYSTEM ====================

  async getEconomyUser(guildId: string, userId: string) {
    const [result] = await this.sql<
      { guild_id: string; user_id: string; balance: string; last_daily: Date | null; last_work: Date | null }[]
    >`
      SELECT * FROM economy_users WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;

    if (!result) {
      return { guild_id: guildId, user_id: userId, balance: 0, last_daily: null, last_work: null };
    }
    return { ...result, balance: parseInt(result.balance) || 0 };
  }

  async setBalance(guildId: string, userId: string, amount: number) {
    await this.sql`
      INSERT INTO economy_users (guild_id, user_id, balance)
      VALUES (${guildId}, ${userId}, ${amount})
      ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = ${amount}
    `;
  }

  async addBalance(guildId: string, userId: string, amount: number) {
    const [result] = await this.sql<{ balance: string }[]>`
      INSERT INTO economy_users (guild_id, user_id, balance)
      VALUES (${guildId}, ${userId}, ${amount})
      ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = economy_users.balance + ${amount}
      RETURNING balance
    `;
    return parseInt(result.balance) || 0;
  }

  async transferBalance(guildId: string, fromUserId: string, toUserId: string, amount: number) {
    try {
      await this.sql.begin(async (sql) => {
        // Deduct from sender
        const [sender] = await sql<{ balance: string }[]>`
          SELECT balance FROM economy_users WHERE guild_id = ${guildId} AND user_id = ${fromUserId}
        `;
        if (!sender || parseInt(sender.balance) < amount) {
          throw new Error("Insufficient balance");
        }
        await sql`UPDATE economy_users SET balance = balance - ${amount} WHERE guild_id = ${guildId} AND user_id = ${fromUserId}`;
        // Add to recipient
        await sql`
          INSERT INTO economy_users (guild_id, user_id, balance)
          VALUES (${guildId}, ${toUserId}, ${amount})
          ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = economy_users.balance + ${amount}
        `;
      });
      return true;
    } catch {
      return false;
    }
  }

  async getEconomyLeaderboard(guildId: string, limit = 10) {
    const results = await this.sql<{ guild_id: string; user_id: string; balance: string }[]>`
      SELECT guild_id, user_id, balance FROM economy_users WHERE guild_id = ${guildId} ORDER BY balance DESC LIMIT ${limit}
    `;
    return results.map((r) => ({ ...r, balance: parseInt(r.balance) || 0 }));
  }

  async setLastDaily(guildId: string, userId: string) {
    await this.sql`
      INSERT INTO economy_users (guild_id, user_id, last_daily)
      VALUES (${guildId}, ${userId}, CURRENT_TIMESTAMP)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET last_daily = CURRENT_TIMESTAMP
    `;
  }

  async setLastWork(guildId: string, userId: string) {
    await this.sql`
      INSERT INTO economy_users (guild_id, user_id, last_work)
      VALUES (${guildId}, ${userId}, CURRENT_TIMESTAMP)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET last_work = CURRENT_TIMESTAMP
    `;
  }

  // ==================== CRYPTO SYSTEM ====================

  async getCryptoHoldings(guildId: string, userId: string) {
    return await this.sql<{ guild_id: string; user_id: string; crypto: string; amount: number }[]>`
      SELECT * FROM economy_holdings WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
  }

  async getCryptoHolding(guildId: string, userId: string, crypto: string) {
    const [result] = await this.sql<{ guild_id: string; user_id: string; crypto: string; amount: number }[]>`
      SELECT * FROM economy_holdings WHERE guild_id = ${guildId} AND user_id = ${userId} AND crypto = ${crypto}
    `;
    return result;
  }

  async setCryptoHolding(guildId: string, userId: string, crypto: string, amount: number) {
    if (amount <= 0) {
      await this.sql`DELETE FROM economy_holdings WHERE guild_id = ${guildId} AND user_id = ${userId} AND crypto = ${crypto}`;
    } else {
      await this.sql`
        INSERT INTO economy_holdings (guild_id, user_id, crypto, amount)
        VALUES (${guildId}, ${userId}, ${crypto}, ${amount})
        ON CONFLICT (guild_id, user_id, crypto) DO UPDATE SET amount = ${amount}
      `;
    }
  }

  async addCryptoHolding(guildId: string, userId: string, crypto: string, amount: number) {
    const [result] = await this.sql<{ amount: number }[]>`
      INSERT INTO economy_holdings (guild_id, user_id, crypto, amount)
      VALUES (${guildId}, ${userId}, ${crypto}, ${amount})
      ON CONFLICT (guild_id, user_id, crypto) DO UPDATE SET amount = economy_holdings.amount + ${amount}
      RETURNING amount
    `;
    return result.amount;
  }

  async getCryptoPrice(guildId: string, crypto: string) {
    const [result] = await this.sql<{ price: number }[]>`
      SELECT price FROM economy_prices WHERE guild_id = ${guildId} AND crypto = ${crypto}
    `;
    return result?.price ?? 100; // Default price of 100
  }

  async setCryptoPrice(guildId: string, crypto: string, price: number) {
    await this.sql`
      INSERT INTO economy_prices (guild_id, crypto, price, last_updated)
      VALUES (${guildId}, ${crypto}, ${price}, CURRENT_TIMESTAMP)
      ON CONFLICT (guild_id, crypto) DO UPDATE SET price = ${price}, last_updated = CURRENT_TIMESTAMP
    `;
  }

  async getAllCryptoPrices(guildId: string) {
    return await this.sql<{ guild_id: string; crypto: string; price: number; last_updated: Date }[]>`
      SELECT * FROM economy_prices WHERE guild_id = ${guildId}
    `;
  }

  async getCryptoPriceHistory(guildId: string, crypto: string, limit = 50) {
    return await this.sql<{ guild_id: string; crypto: string; price: number; recorded_at: Date }[]>`
      SELECT guild_id, crypto, price, recorded_at FROM economy_price_history
      WHERE guild_id = ${guildId} AND crypto = ${crypto}
      ORDER BY recorded_at DESC LIMIT ${limit}
    `;
  }

  async recordCryptoPrice(guildId: string, crypto: string, price: number) {
    await this.sql`
      INSERT INTO economy_price_history (guild_id, crypto, price)
      VALUES (${guildId}, ${crypto}, ${price})
    `;
  }

  // ==================== TRANSACTION LOG ====================

  async logTransaction(guildId: string, userId: string, type: string, amount: number, crypto?: string, details?: string) {
    await this.sql`
      INSERT INTO economy_transactions (guild_id, user_id, type, amount, crypto, details)
      VALUES (${guildId}, ${userId}, ${type}, ${amount}, ${crypto ?? null}, ${details ?? null})
    `;
  }

  async getTransactions(guildId: string, userId: string, limit = 20) {
    return await this.sql<
      { id: number; guild_id: string; user_id: string; type: string; amount: number; crypto: string | null; details: string | null; created_at: Date }[]
    >`
      SELECT * FROM economy_transactions WHERE guild_id = ${guildId} AND user_id = ${userId}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  }

  // ==================== ECONOMY SETTINGS ====================

  async getEconomySettings(guildId: string) {
    const [result] = await this.sql<
      { guild_id: string; enabled: boolean; daily_amount: number; work_min: number; work_max: number; work_cooldown: number; daily_cooldown: number }[]
    >`
      SELECT * FROM economy_settings WHERE guild_id = ${guildId}
    `;
    return result ?? {
      guild_id: guildId,
      enabled: false,
      daily_amount: 100,
      work_min: 10,
      work_max: 50,
      work_cooldown: 3600,
      daily_cooldown: 86400,
    };
  }

  async setEconomySettings(settings: {
    guild_id: string;
    enabled: boolean;
    daily_amount: number;
    work_min: number;
    work_max: number;
    work_cooldown: number;
    daily_cooldown: number;
  }) {
    await this.sql`
      INSERT INTO economy_settings (guild_id, enabled, daily_amount, work_min, work_max, work_cooldown, daily_cooldown)
      VALUES (${settings.guild_id}, ${settings.enabled}, ${settings.daily_amount}, ${settings.work_min}, ${settings.work_max}, ${settings.work_cooldown}, ${settings.daily_cooldown})
      ON CONFLICT (guild_id) DO UPDATE SET
        enabled = ${settings.enabled},
        daily_amount = ${settings.daily_amount},
        work_min = ${settings.work_min},
        work_max = ${settings.work_max},
        work_cooldown = ${settings.work_cooldown},
        daily_cooldown = ${settings.daily_cooldown}
    `;
  }

  async isEconomyEnabled(guildId: string) {
    const [result] = await this.sql<{ enabled: boolean }[]>`
      SELECT enabled FROM economy_settings WHERE guild_id = ${guildId}
    `;
    return result?.enabled === true;
  }

  // ==================== ADMIN MARKET MANIPULATION ====================

  async inflateAllBalances(guildId: string, percentage: number) {
    const multiplier = 1 + (percentage / 100);
    const result = await this.sql`
      UPDATE economy_users SET balance = FLOOR(balance * ${multiplier}) WHERE guild_id = ${guildId}
    `;
    return result.count;
  }

  async wipeUserEconomy(guildId: string, userId: string) {
    await this.sql`DELETE FROM economy_users WHERE guild_id = ${guildId} AND user_id = ${userId}`;
    await this.sql`DELETE FROM economy_holdings WHERE guild_id = ${guildId} AND user_id = ${userId}`;
  }

  async wipeCrypto(guildId: string, crypto?: string) {
    if (crypto) {
      await this.sql`DELETE FROM economy_holdings WHERE guild_id = ${guildId} AND crypto = ${crypto}`;
      await this.sql`DELETE FROM economy_prices WHERE guild_id = ${guildId} AND crypto = ${crypto}`;
    } else {
      await this.sql`DELETE FROM economy_holdings WHERE guild_id = ${guildId}`;
      await this.sql`DELETE FROM economy_prices WHERE guild_id = ${guildId}`;
    }
  }
}
