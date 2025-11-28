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
import type { Count, DBGuild, Tag } from "#utils/types.js";
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
    const [result]: [{ user_id: string; locale: string | null; dm_notifications: boolean }?] =
      await this.sql`SELECT * FROM user_preferences WHERE user_id = ${userId}`;

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
    const [existing]: [{ user_id: string }?] =
      await this.sql`SELECT user_id FROM user_preferences WHERE user_id = ${userId}`;

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
    await this.sql`INSERT INTO mod_logs (guild_id, user_id, moderator_id, action, reason) VALUES (${guildId}, ${userId}, ${moderatorId}, ${action}, ${reason ?? null})`;
  }

  async getModLogs(guildId: string, userId?: string, limit = 10) {
    if (userId) {
      return await this.sql<{ id: number; guild_id: string; user_id: string; moderator_id: string; action: string; reason: string | null; created_at: Date }[]>`
        SELECT * FROM mod_logs WHERE guild_id = ${guildId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
      `;
    }
    return await this.sql<{ id: number; guild_id: string; user_id: string; moderator_id: string; action: string; reason: string | null; created_at: Date }[]>`
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
    return await this.sql<{ id: number; guild_id: string; user_id: string; moderator_id: string; reason: string; created_at: Date }[]>`
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

  async getUserLevel(guildId: string, userId: string) {
    const [result] = await this.sql<{ guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: Date | null }[]>`
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
    return await this.sql<{ guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: Date | null }[]>`
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
}
