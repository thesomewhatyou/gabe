import process from "node:process";
import type { Database as DenoDatabase, Statement as DenoStatement } from "@db/sqlite";
import type {
  Database as BSQLite3Database,
  Options as BSQLite3Options,
  Statement as BSQLite3Statement,
} from "better-sqlite3";
import type { Database as BunDatabase, Statement as BunStatement } from "bun:sqlite";
import type { Guild, GuildChannel } from "oceanic.js";
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

type BunDenoDatabase = typeof BunDatabase | typeof DenoDatabase;

// bun:sqlite and @db/sqlite are mostly compatible with better-sqlite3,
// but have a few minor type differences that don't really matter in our case
// here we attempt to bring them closer together
type CombinedConnection = {
  prepare: (query: string) => BSQLite3Statement | BunStatement | DenoStatement;
  transaction: (func: () => void) => CallableFunction;
} & (BSQLite3Database | BunDatabase | DenoDatabase);

type BSQLite3Init = (filename?: string, options?: BSQLite3Options) => BSQLite3Database;
type CombinedConstructor = BunDenoDatabase | BSQLite3Init;
let dbInit: CombinedConstructor;

if (process.versions.bun) {
  const { Database } = await import("bun:sqlite");
  dbInit = Database;
} else if (process.versions.deno) {
  const { Database } = await import("@db/sqlite");
  dbInit = Database;
} else {
  const { default: sqlite3 } = await import("better-sqlite3");
  dbInit = sqlite3;
}

const schema = `
CREATE TABLE guilds (
  guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
  prefix VARCHAR(15) NOT NULL,
  disabled text NOT NULL,
  disabled_commands text NOT NULL,
  tag_roles VARCHAR DEFAULT '[]'
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
CREATE TABLE settings (
  id smallint PRIMARY KEY,
  broadcast VARCHAR,
  CHECK(id = 1)
);
CREATE TABLE starboard_settings (
  guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
  channel_id VARCHAR(30),
  emoji VARCHAR(64) NOT NULL DEFAULT '⭐',
  threshold INTEGER NOT NULL DEFAULT 3,
  allow_self INTEGER NOT NULL DEFAULT 0,
  allow_bots INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 0
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
INSERT INTO settings (id) VALUES (1);
`;

const updates = [
  "", // reserved
  "ALTER TABLE guilds ADD COLUMN accessed int",
  "ALTER TABLE guilds DROP COLUMN accessed",
  `CREATE TABLE settings (
    id smallint PRIMARY KEY,
    broadcast VARCHAR,
    CHECK(id = 1)
  );
  INSERT INTO settings (id) VALUES (1);`,
  "ALTER TABLE guilds ADD COLUMN tag_roles VARCHAR DEFAULT '[]'",
  `WITH cmds AS (
     SELECT sum("count") AS amount FROM counts WHERE command IN ('qrcreate', 'qrread', 'qr')
  ) INSERT OR REPLACE INTO counts ("command", "count") VALUES ('qr', (SELECT amount FROM cmds));
  WITH cmds AS (
    SELECT sum("count") AS amount FROM counts WHERE command IN (
      '9gag', 'avs4you', 'bandicam', 'deviantart', 'funky',
		  'hypercam', 'ifunny', 'kinemaster', 'memecenter',
		  'powerdirector', 'shutterstock', 'watermark'
    )
  ) INSERT OR REPLACE INTO counts ("command", "count") VALUES ('watermark', (SELECT amount FROM cmds));`,
  // User preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(30) PRIMARY KEY,
    locale VARCHAR(10),
    dm_notifications INTEGER DEFAULT 1
  );`,
  // Moderation logs and warnings tables
  `CREATE TABLE IF NOT EXISTS mod_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    moderator_id VARCHAR(30) NOT NULL,
    action VARCHAR(20) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  ALTER TABLE guilds ADD COLUMN levels_enabled INTEGER DEFAULT 0;`,
  // Level-up notifications setting
  `ALTER TABLE guilds ADD COLUMN level_up_notifications INTEGER DEFAULT 1;`,
  `CREATE TABLE IF NOT EXISTS starboard_settings (
    guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
    channel_id VARCHAR(30),
    emoji VARCHAR(64) NOT NULL DEFAULT '⭐',
    threshold INTEGER NOT NULL DEFAULT 3,
    allow_self INTEGER NOT NULL DEFAULT 0,
    allow_bots INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 0
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
];

export default class SQLitePlugin implements DatabasePlugin {
  connection: CombinedConnection;

  constructor(connectString: string) {
    if (process.versions.bun || process.versions.deno) {
      this.connection = new (dbInit as BunDenoDatabase)(connectString.replace("sqlite://", ""), {
        create: true,
        readwrite: true,
        strict: true,
      });
    } else {
      this.connection = (dbInit as BSQLite3Init)(connectString.replace("sqlite://", ""));
    }
  }

  async setup() {
    const existingCommands = (this.connection.prepare("SELECT command FROM counts").all() as { command: string }[]).map(
      (x) => x.command,
    );
    const commandNames = [...commands.keys(), ...messageCommands.keys(), ...userCommands.keys()];
    for (const command of commandNames) {
      if (!existingCommands.includes(command)) {
        this.connection.prepare("INSERT INTO counts (command, count) VALUES (?, ?)").run(command, 0);
      }
    }
  }

  async stop() {
    this.connection.close();
  }

  async upgrade() {
    this.connection.exec("PRAGMA journal_mode = WAL;");
    try {
      this.connection.transaction(() => {
        let version: number;
        const result = this.connection.prepare("PRAGMA user_version").get() as { user_version: number };
        version = result?.user_version ?? 0;
        const latestVersion = updates.length - 1;
        if (version === 0) {
          logger.info("Initializing SQLite database...");
          this.connection.exec(schema);
        } else if (version < latestVersion) {
          logger.info(`Migrating SQLite database at ${process.env.DB}, which is currently at version ${version}...`);
          while (version < latestVersion) {
            version++;
            logger.info(`Running version ${version} update script...`);
            this.connection.exec(updates[version]);
          }
        } else {
          return;
        }
        this.connection.exec(`PRAGMA user_version = ${latestVersion}`);
      })();
    } catch (e) {
      logger.error(`SQLite migration failed: ${e}`);
      logger.error("Unable to start the bot, quitting now.");
      return 1;
    }
  }

  async addCount(command: string) {
    this.connection.prepare("UPDATE counts SET count = count + 1 WHERE command = ?").run(command);
  }

  async getCounts(all?: boolean) {
    const counts = this.connection.prepare("SELECT * FROM counts").all() as Count[];
    const commandNames = [...commands.keys(), ...messageCommands.keys(), ...userCommands.keys()];
    const countMap = new Map(
      (all ? counts : counts.filter((val) => commandNames.includes(val.command))).map((val) => [
        val.command,
        val.count,
      ]),
    );
    return countMap;
  }

  async disableCommand(guild: string, command: string) {
    const guildDB = await this.getGuild(guild);
    this.connection
      .prepare("UPDATE guilds SET disabled_commands = ? WHERE guild_id = ?")
      .run(
        JSON.stringify(
          (guildDB.disabled_commands ? [...guildDB.disabled_commands, command] : [command]).filter((v) => !!v),
        ),
        guild,
      );
    disabledCmdCache.set(
      guild,
      guildDB.disabled_commands ? [...guildDB.disabled_commands, command] : [command].filter((v) => !!v),
    );
  }

  async enableCommand(guild: string, command: string) {
    const guildDB = await this.getGuild(guild);
    const newDisabled = guildDB.disabled_commands ? guildDB.disabled_commands.filter((item) => item !== command) : [];
    this.connection
      .prepare("UPDATE guilds SET disabled_commands = ? WHERE guild_id = ?")
      .run(JSON.stringify(newDisabled), guild);
    disabledCmdCache.set(guild, newDisabled);
  }

  async disableChannel(channel: GuildChannel) {
    const guildDB = await this.getGuild(channel.guildID);
    this.connection
      .prepare("UPDATE guilds SET disabled = ? WHERE guild_id = ?")
      .run(JSON.stringify([...guildDB.disabled, channel.id]), channel.guildID);
    disabledCache.set(channel.guildID, [...guildDB.disabled, channel.id]);
  }

  async enableChannel(channel: GuildChannel) {
    const guildDB = await this.getGuild(channel.guildID);
    const newDisabled = guildDB.disabled.filter((item: string) => item !== channel.id);
    this.connection
      .prepare("UPDATE guilds SET disabled = ? WHERE guild_id = ?")
      .run(JSON.stringify(newDisabled), channel.guildID);
    disabledCache.set(channel.guildID, newDisabled);
  }

  async getTag(guild: string, tag: string) {
    const tagResult = this.connection.prepare("SELECT * FROM tags WHERE guild_id = ? AND name = ?").get(guild, tag) as
      | Tag
      | undefined;
    return tagResult;
  }

  async getTags(guild: string) {
    const tagArray = this.connection.prepare("SELECT * FROM tags WHERE guild_id = ?").all(guild) as Tag[];
    const tags: Record<string, Tag> = {};
    for (const tag of tagArray) {
      tags[tag.name] = tag;
    }
    return tags;
  }

  async setTag(tag: Tag, guild: Guild) {
    const tagData = {
      guild_id: guild.id,
      name: tag.name,
      content: tag.content,
      author: tag.author,
    };
    this.connection
      .prepare("INSERT INTO tags (guild_id, name, content, author) VALUES (:guild_id, :name, :content, :author)")
      .run(tagData);
  }

  async removeTag(name: string, guild: Guild) {
    this.connection.prepare("DELETE FROM tags WHERE guild_id = ? AND name = ?").run(guild.id, name);
  }

  async editTag(tag: Tag, guild: Guild) {
    this.connection
      .prepare("UPDATE tags SET content = ?, author = ? WHERE guild_id = ? AND name = ?")
      .run(tag.content, tag.author, guild.id, tag.name);
  }

  async addTagRole(guild: string, role: string) {
    const guildDB = await this.getGuild(guild);
    this.connection
      .prepare("UPDATE guilds SET tag_roles = ? WHERE guild_id = ?")
      .run(JSON.stringify([...guildDB.tag_roles, role]), guild);
  }

  async removeTagRole(guild: string, role: string) {
    const guildDB = await this.getGuild(guild);
    this.connection
      .prepare("UPDATE guilds SET tag_roles = ? WHERE guild_id = ?")
      .run(JSON.stringify(guildDB.tag_roles.filter((v) => v !== role)), guild);
  }

  async setBroadcast(msg?: string) {
    this.connection.prepare("UPDATE settings SET broadcast = ? WHERE id = 1").run(msg);
  }

  async getBroadcast() {
    const result = this.connection.prepare("SELECT broadcast FROM settings WHERE id = 1").get() as {
      broadcast: string | undefined;
    };
    return result.broadcast;
  }

  async setPrefix(prefix: string, guild: Guild) {
    this.connection.prepare("UPDATE guilds SET prefix = ? WHERE guild_id = ?").run(prefix, guild.id);
    prefixCache.set(guild.id, prefix);
  }

  async getGuild(query: string): Promise<DBGuild> {
    // SQLite does not support arrays, so instead we convert them from strings
    let guild:
      | ({
        disabled: string;
        disabled_commands: string;
        tag_roles: string;
      } & Omit<DBGuild, "disabled" | "disabled_commands" | "tag_roles">)
      | undefined;
    this.connection.transaction(() => {
      guild = this.connection.prepare("SELECT * FROM guilds WHERE guild_id = ?").get(query) as {
        disabled: string;
        disabled_commands: string;
        tag_roles: string;
      } & Omit<DBGuild, "disabled" | "disabled_commands" | "tag_roles">;
      if (!guild) {
        const guild_id = query;
        const prefix = process.env.PREFIX ?? "&";
        guild = {
          guild_id,
          prefix,
          disabled: "[]",
          disabled_commands: "[]",
          tag_roles: "[]",
        };
        this.connection
          .prepare(
            "INSERT INTO guilds (guild_id, prefix, disabled, disabled_commands, tag_roles) VALUES (:guild_id, :prefix, :disabled, :disabled_commands, :tag_roles)",
          )
          .run(guild);
      }
    })();
    if (guild) {
      guild.disabled = JSON.parse(guild.disabled);
      guild.disabled_commands = JSON.parse(guild.disabled_commands);
      guild.tag_roles = JSON.parse(guild.tag_roles);
    }
    return (
      (guild as DBGuild | undefined) ?? {
        guild_id: query,
        prefix: process.env.PREFIX ?? "&",
        disabled: [],
        disabled_commands: [],
        tag_roles: [],
      }
    );
  }

  async getUserPreferences(userId: string) {
    const result = this.connection
      .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
      .get(userId) as { user_id: string; locale: string | null; dm_notifications: number } | undefined;

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
      dm_notifications: result.dm_notifications === 1,
    };
  }

  async setUserPreference(userId: string, key: "locale" | "dm_notifications", value: string | boolean | null) {
    const existing = this.connection
      .prepare("SELECT user_id FROM user_preferences WHERE user_id = ?")
      .get(userId);

    const dbValue = typeof value === "boolean" ? (value ? 1 : 0) : value;

    if (existing) {
      this.connection
        .prepare(`UPDATE user_preferences SET ${key} = ? WHERE user_id = ?`)
        .run(dbValue, userId);
    } else {
      const defaults = {
        user_id: userId,
        locale: null as string | null,
        dm_notifications: 1,
      };
      defaults[key] = dbValue as never;
      this.connection
        .prepare("INSERT INTO user_preferences (user_id, locale, dm_notifications) VALUES (:user_id, :locale, :dm_notifications)")
        .run(defaults);
    }
  }

  async addModLog(guildId: string, userId: string, moderatorId: string, action: string, reason?: string) {
    this.connection
      .prepare("INSERT INTO mod_logs (guild_id, user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?, ?)")
      .run(guildId, userId, moderatorId, action, reason ?? null);
  }

  async getModLogs(guildId: string, userId?: string, limit = 10) {
    if (userId) {
      return this.connection
        .prepare("SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?")
        .all(guildId, userId, limit) as { id: number; guild_id: string; user_id: string; moderator_id: string; action: string; reason: string | null; created_at: string }[];
    }
    return this.connection
      .prepare("SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(guildId, limit) as { id: number; guild_id: string; user_id: string; moderator_id: string; action: string; reason: string | null; created_at: string }[];
  }

  async addWarning(guildId: string, userId: string, moderatorId: string, reason: string) {
    const result = this.connection
      .prepare("INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)")
      .run(guildId, userId, moderatorId, reason);
    return (typeof result === 'number' ? result : result.lastInsertRowid) as number;
  }

  async getWarnings(guildId: string, userId: string) {
    return this.connection
      .prepare("SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC")
      .all(guildId, userId) as { id: number; guild_id: string; user_id: string; moderator_id: string; reason: string; created_at: string }[];
  }

  async removeWarning(guildId: string, warningId: number) {
    const result = this.connection
      .prepare("DELETE FROM warnings WHERE guild_id = ? AND id = ?")
      .run(guildId, warningId);
    return (typeof result === 'number' ? result > 0 : result.changes > 0);
  }

  async clearWarnings(guildId: string, userId: string) {
    const result = this.connection
      .prepare("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?")
      .run(guildId, userId);
    return typeof result === 'number' ? result : result.changes;
  }

  async getUserLevel(guildId: string, userId: string) {
    const result = this.connection
      .prepare("SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: string | null } | undefined;

    if (!result) {
      return { guild_id: guildId, user_id: userId, xp: 0, level: 0, last_xp_gain: null };
    }
    return result;
  }

  async addXP(guildId: string, userId: string, amount: number) {
    const now = new Date().toISOString();
    const existing = this.connection
      .prepare("SELECT xp, level FROM user_levels WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { xp: number; level: number } | undefined;

    if (existing) {
      const newXP = existing.xp + amount;
      const newLevel = Math.floor(0.1 * Math.sqrt(newXP));
      const leveledUp = newLevel > existing.level;

      this.connection
        .prepare("UPDATE user_levels SET xp = ?, level = ?, last_xp_gain = ? WHERE guild_id = ? AND user_id = ?")
        .run(newXP, newLevel, now, guildId, userId);

      return { xp: newXP, level: newLevel, leveledUp };
    } else {
      const newLevel = Math.floor(0.1 * Math.sqrt(amount));
      this.connection
        .prepare("INSERT INTO user_levels (guild_id, user_id, xp, level, last_xp_gain) VALUES (?, ?, ?, ?, ?)")
        .run(guildId, userId, amount, newLevel, now);

      return { xp: amount, level: newLevel, leveledUp: newLevel > 0 };
    }
  }

  async getLeaderboard(guildId: string, limit = 10) {
    return this.connection
      .prepare("SELECT * FROM user_levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?")
      .all(guildId, limit) as { guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: string | null }[];
  }

  async setLevelsEnabled(guildId: string, enabled: boolean) {
    this.connection
      .prepare("UPDATE guilds SET levels_enabled = ? WHERE guild_id = ?")
      .run(enabled ? 1 : 0, guildId);
  }

  async isLevelsEnabled(guildId: string) {
    const result = this.connection
      .prepare("SELECT levels_enabled FROM guilds WHERE guild_id = ?")
      .get(guildId) as { levels_enabled: number } | undefined;
    return result?.levels_enabled === 1;
  }

  async setLevelUpNotifications(guildId: string, enabled: boolean) {
    this.connection
      .prepare("UPDATE guilds SET level_up_notifications = ? WHERE guild_id = ?")
      .run(enabled ? 1 : 0, guildId);
  }

  async isLevelUpNotificationsEnabled(guildId: string) {
    const result = this.connection
      .prepare("SELECT level_up_notifications FROM guilds WHERE guild_id = ?")
      .get(guildId) as { level_up_notifications: number } | undefined;
    return result?.level_up_notifications !== 0; // Default to true (1) if not set
  }

  async getStarboardSettings(guildId: string) {
    const result = this.connection
      .prepare("SELECT * FROM starboard_settings WHERE guild_id = ?")
      .get(guildId) as StarboardSettings | undefined;
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
    this.connection
      .prepare(`INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold, allow_self, allow_bots, enabled)
        VALUES (:guild_id, :channel_id, :emoji, :threshold, :allow_self, :allow_bots, :enabled)
        ON CONFLICT(guild_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          emoji = excluded.emoji,
          threshold = excluded.threshold,
          allow_self = excluded.allow_self,
          allow_bots = excluded.allow_bots,
          enabled = excluded.enabled`)
      .run({
        ...settings,
        allow_self: settings.allow_self ? 1 : 0,
        allow_bots: settings.allow_bots ? 1 : 0,
        enabled: settings.enabled ? 1 : 0,
      });
  }

  async getStarboardEntry(guildId: string, messageId: string) {
    return this.connection
      .prepare("SELECT * FROM starboard_messages WHERE guild_id = ? AND message_id = ?")
      .get(guildId, messageId) as StarboardEntry | undefined;
  }

  async upsertStarboardEntry(entry: StarboardEntry) {
    this.connection
      .prepare(`INSERT INTO starboard_messages
        (guild_id, message_id, channel_id, starboard_message_id, star_count, author_id)
        VALUES (:guild_id, :message_id, :channel_id, :starboard_message_id, :star_count, :author_id)
        ON CONFLICT(guild_id, message_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          starboard_message_id = excluded.starboard_message_id,
          star_count = excluded.star_count,
          author_id = excluded.author_id`)
      .run(entry);
  }

  async deleteStarboardEntry(guildId: string, messageId: string) {
    this.connection
      .prepare("DELETE FROM starboard_messages WHERE guild_id = ? AND message_id = ?")
      .run(guildId, messageId);
  }

  async pruneStarboardEntries(guildId: string, olderThan: number) {
    this.connection
      .prepare("DELETE FROM starboard_messages WHERE guild_id = ? AND star_count <= 0")
      .run(guildId);
  }
}
