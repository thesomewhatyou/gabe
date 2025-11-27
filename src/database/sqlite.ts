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
import type { Count, DBGuild, Tag } from "#utils/types.js";
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
    return result.lastInsertRowid as number;
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
    return result.changes > 0;
  }

  async clearWarnings(guildId: string, userId: string) {
    const result = this.connection
      .prepare("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?")
      .run(guildId, userId);
    return result.changes;
  }
}
