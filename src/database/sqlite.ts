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
  tag_roles VARCHAR DEFAULT '[]',
  levels_enabled INTEGER DEFAULT 0,
  level_up_notifications INTEGER DEFAULT 1
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
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(30) PRIMARY KEY,
  locale VARCHAR(10),
  dm_notifications INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS mod_logs (
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
CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
CREATE TABLE IF NOT EXISTS user_levels (
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  last_xp_gain TIMESTAMP,
  PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS economy_users (
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  balance INTEGER DEFAULT 0,
  last_daily TIMESTAMP,
  last_work TIMESTAMP,
  PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS economy_holdings (
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  crypto VARCHAR(20) NOT NULL,
  amount REAL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id, crypto)
);
CREATE TABLE IF NOT EXISTS economy_prices (
  guild_id VARCHAR(30) NOT NULL,
  crypto VARCHAR(20) NOT NULL,
  price REAL DEFAULT 100,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, crypto)
);
CREATE TABLE IF NOT EXISTS economy_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(30) NOT NULL,
  crypto VARCHAR(20) NOT NULL,
  price REAL NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_history_guild_crypto ON economy_price_history(guild_id, crypto);
CREATE TABLE IF NOT EXISTS economy_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  type VARCHAR(30) NOT NULL,
  amount REAL NOT NULL,
  crypto VARCHAR(20),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_guild_user ON economy_transactions(guild_id, user_id);
CREATE TABLE IF NOT EXISTS economy_settings (
  guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  daily_amount INTEGER DEFAULT 100,
  work_min INTEGER DEFAULT 10,
  work_max INTEGER DEFAULT 50,
  work_cooldown INTEGER DEFAULT 3600,
  daily_cooldown INTEGER DEFAULT 86400
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(30) NOT NULL,
  channel_id VARCHAR(30) UNIQUE NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'open',
  claimed_by VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  close_reason TEXT
);
CREATE TABLE IF NOT EXISTS ticket_settings (
  guild_id VARCHAR(30) PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  category_id VARCHAR(30),
  support_role_id VARCHAR(30),
  log_channel_id VARCHAR(30),
  ticket_message TEXT,
  auto_close_hours INTEGER,
  max_open_per_user INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(guild_id, user_id);
CREATE TABLE IF NOT EXISTS reputation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  from_user_id VARCHAR(30) NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rep_guild_user ON reputation(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rep_from ON reputation(guild_id, from_user_id, user_id);
CREATE TABLE IF NOT EXISTS birthdays (
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  birth_month INTEGER NOT NULL,
  birth_day INTEGER NOT NULL,
  birth_year INTEGER,
  PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS birthday_settings (
  guild_id VARCHAR(30) PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  channel_id VARCHAR(30),
  role_id VARCHAR(30),
  message TEXT
);
CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays(birth_month, birth_day);
CREATE TABLE IF NOT EXISTS antinuke_settings (
  guild_id VARCHAR(30) PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  threshold INTEGER DEFAULT 15,
  time_window INTEGER DEFAULT 5,
  log_channel_id VARCHAR(30),
  trusted_user VARCHAR(50),
  whitelisted_users TEXT DEFAULT '[]',
  whitelisted_roles TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS antinuke_offenses (
  guild_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  offense_count INTEGER DEFAULT 0,
  last_offense TIMESTAMP,
  PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS antinuke_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(30) NOT NULL,
  executor_id VARCHAR(30) NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  target_id VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_antinuke_actions_lookup ON antinuke_actions(guild_id, executor_id, created_at);
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
  // Economy system tables
  `CREATE TABLE IF NOT EXISTS economy_users (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    balance INTEGER DEFAULT 0,
    last_daily TIMESTAMP,
    last_work TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS economy_holdings (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    amount REAL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, crypto)
  );
  CREATE TABLE IF NOT EXISTS economy_prices (
    guild_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    price REAL DEFAULT 100,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, crypto)
  );
  CREATE TABLE IF NOT EXISTS economy_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    price REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_price_history_guild_crypto ON economy_price_history(guild_id, crypto);
  CREATE TABLE IF NOT EXISTS economy_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount REAL NOT NULL,
    crypto VARCHAR(20),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_guild_user ON economy_transactions(guild_id, user_id);
  CREATE TABLE IF NOT EXISTS economy_settings (
    guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    daily_amount INTEGER DEFAULT 100,
    work_min INTEGER DEFAULT 10,
    work_max INTEGER DEFAULT 50,
    work_cooldown INTEGER DEFAULT 3600,
    daily_cooldown INTEGER DEFAULT 86400
  );`,
  // Ticket system tables
  `CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    channel_id VARCHAR(30) UNIQUE NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'open',
    claimed_by VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    close_reason TEXT
  );
  CREATE TABLE IF NOT EXISTS ticket_settings (
    guild_id VARCHAR(30) PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    category_id VARCHAR(30),
    support_role_id VARCHAR(30),
    log_channel_id VARCHAR(30),
    ticket_message TEXT,
    auto_close_hours INTEGER,
    max_open_per_user INTEGER DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(guild_id, user_id);`,
  // Reputation system
  `CREATE TABLE IF NOT EXISTS reputation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    from_user_id VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_rep_guild_user ON reputation(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_rep_from ON reputation(guild_id, from_user_id, user_id);`,
  // Birthday system
  `CREATE TABLE IF NOT EXISTS birthdays (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_year INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS birthday_settings (
    guild_id VARCHAR(30) PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    channel_id VARCHAR(30),
    role_id VARCHAR(30),
    message TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays(birth_month, birth_day);`,
  // Anti-nuke system
  `CREATE TABLE IF NOT EXISTS antinuke_settings (
    guild_id VARCHAR(30) PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    threshold INTEGER DEFAULT 15,
    time_window INTEGER DEFAULT 5,
    log_channel_id VARCHAR(30),
    trusted_user VARCHAR(50),
    whitelisted_users TEXT DEFAULT '[]',
    whitelisted_roles TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS antinuke_offenses (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    offense_count INTEGER DEFAULT 0,
    last_offense TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS antinuke_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    executor_id VARCHAR(30) NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    target_id VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_antinuke_actions_lookup ON antinuke_actions(guild_id, executor_id, created_at);`,
  // Catch-all for missing tables in broken V0->Latest migrations
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(30) PRIMARY KEY,
    locale VARCHAR(10),
    dm_notifications INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS mod_logs (
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
  CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
  CREATE TABLE IF NOT EXISTS user_levels (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_xp_gain TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS economy_users (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    balance INTEGER DEFAULT 0,
    last_daily TIMESTAMP,
    last_work TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS economy_holdings (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    amount REAL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, crypto)
  );
  CREATE TABLE IF NOT EXISTS economy_prices (
    guild_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    price REAL DEFAULT 100,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, crypto)
  );
  CREATE TABLE IF NOT EXISTS economy_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    crypto VARCHAR(20) NOT NULL,
    price REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_price_history_guild_crypto ON economy_price_history(guild_id, crypto);
  CREATE TABLE IF NOT EXISTS economy_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount REAL NOT NULL,
    crypto VARCHAR(20),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_guild_user ON economy_transactions(guild_id, user_id);
  CREATE TABLE IF NOT EXISTS economy_settings (
    guild_id VARCHAR(30) NOT NULL PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    daily_amount INTEGER DEFAULT 100,
    work_min INTEGER DEFAULT 10,
    work_max INTEGER DEFAULT 50,
    work_cooldown INTEGER DEFAULT 3600,
    daily_cooldown INTEGER DEFAULT 86400
  );
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    channel_id VARCHAR(30) UNIQUE NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'open',
    claimed_by VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    close_reason TEXT
  );
  CREATE TABLE IF NOT EXISTS ticket_settings (
    guild_id VARCHAR(30) PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    category_id VARCHAR(30),
    support_role_id VARCHAR(30),
    log_channel_id VARCHAR(30),
    ticket_message TEXT,
    auto_close_hours INTEGER,
    max_open_per_user INTEGER DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(guild_id, user_id);
  CREATE TABLE IF NOT EXISTS reputation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    from_user_id VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_rep_guild_user ON reputation(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_rep_from ON reputation(guild_id, from_user_id, user_id);
  CREATE TABLE IF NOT EXISTS birthdays (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_year INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS birthday_settings (
    guild_id VARCHAR(30) PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    channel_id VARCHAR(30),
    role_id VARCHAR(30),
    message TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays(birth_month, birth_day);
  CREATE TABLE IF NOT EXISTS antinuke_settings (
    guild_id VARCHAR(30) PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    threshold INTEGER DEFAULT 15,
    time_window INTEGER DEFAULT 5,
    log_channel_id VARCHAR(30),
    trusted_user VARCHAR(50),
    whitelisted_users TEXT DEFAULT '[]',
    whitelisted_roles TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS antinuke_offenses (
    guild_id VARCHAR(30) NOT NULL,
    user_id VARCHAR(30) NOT NULL,
    offense_count INTEGER DEFAULT 0,
    last_offense TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS antinuke_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(30) NOT NULL,
    executor_id VARCHAR(30) NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    target_id VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_antinuke_actions_lookup ON antinuke_actions(guild_id, executor_id, created_at);`,
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
    const result = this.connection.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(userId) as
      | { user_id: string; locale: string | null; dm_notifications: number }
      | undefined;

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
    const existing = this.connection.prepare("SELECT user_id FROM user_preferences WHERE user_id = ?").get(userId);

    const dbValue = typeof value === "boolean" ? (value ? 1 : 0) : value;

    if (existing) {
      this.connection.prepare(`UPDATE user_preferences SET ${key} = ? WHERE user_id = ?`).run(dbValue, userId);
    } else {
      const defaults = {
        user_id: userId,
        locale: null as string | null,
        dm_notifications: 1,
      };
      defaults[key] = dbValue as never;
      this.connection
        .prepare(
          "INSERT INTO user_preferences (user_id, locale, dm_notifications) VALUES (:user_id, :locale, :dm_notifications)",
        )
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
        .all(guildId, userId, limit) as {
          id: number;
          guild_id: string;
          user_id: string;
          moderator_id: string;
          action: string;
          reason: string | null;
          created_at: string;
        }[];
    }
    return this.connection
      .prepare("SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(guildId, limit) as {
        id: number;
        guild_id: string;
        user_id: string;
        moderator_id: string;
        action: string;
        reason: string | null;
        created_at: string;
      }[];
  }

  async addWarning(guildId: string, userId: string, moderatorId: string, reason: string) {
    const result = this.connection
      .prepare("INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)")
      .run(guildId, userId, moderatorId, reason);
    return (typeof result === "number" ? result : result.lastInsertRowid) as number;
  }

  async getWarnings(guildId: string, userId: string) {
    return this.connection
      .prepare("SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC")
      .all(guildId, userId) as {
        id: number;
        guild_id: string;
        user_id: string;
        moderator_id: string;
        reason: string;
        created_at: string;
      }[];
  }

  async removeWarning(guildId: string, warningId: number) {
    const result = this.connection
      .prepare("DELETE FROM warnings WHERE guild_id = ? AND id = ?")
      .run(guildId, warningId);
    return typeof result === "number" ? result > 0 : result.changes > 0;
  }

  async clearWarnings(guildId: string, userId: string) {
    const result = this.connection
      .prepare("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?")
      .run(guildId, userId);
    return typeof result === "number" ? result : result.changes;
  }

  async getUserLevel(guildId: string, userId: string) {
    const result = this.connection
      .prepare("SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as
      | { guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: string | null }
      | undefined;

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
      .all(guildId, limit) as {
        guild_id: string;
        user_id: string;
        xp: number;
        level: number;
        last_xp_gain: string | null;
      }[];
  }

  async setLevelsEnabled(guildId: string, enabled: boolean) {
    this.connection.prepare("UPDATE guilds SET levels_enabled = ? WHERE guild_id = ?").run(enabled ? 1 : 0, guildId);
  }

  async isLevelsEnabled(guildId: string) {
    const result = this.connection.prepare("SELECT levels_enabled FROM guilds WHERE guild_id = ?").get(guildId) as
      | { levels_enabled: number }
      | undefined;
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
    const result = this.connection.prepare("SELECT * FROM starboard_settings WHERE guild_id = ?").get(guildId) as
      | StarboardSettings
      | undefined;
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
      .prepare(
        `INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold, allow_self, allow_bots, enabled)
        VALUES (:guild_id, :channel_id, :emoji, :threshold, :allow_self, :allow_bots, :enabled)
        ON CONFLICT(guild_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          emoji = excluded.emoji,
          threshold = excluded.threshold,
          allow_self = excluded.allow_self,
          allow_bots = excluded.allow_bots,
          enabled = excluded.enabled`,
      )
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
    const params: Record<string, string | number | null> = {
      guild_id: entry.guild_id,
      message_id: entry.message_id,
      channel_id: entry.channel_id,
      starboard_message_id: entry.starboard_message_id,
      star_count: entry.star_count,
      author_id: entry.author_id,
    };

    this.connection
      .prepare(
        `INSERT INTO starboard_messages
        (guild_id, message_id, channel_id, starboard_message_id, star_count, author_id)
        VALUES (:guild_id, :message_id, :channel_id, :starboard_message_id, :star_count, :author_id)
        ON CONFLICT(guild_id, message_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          starboard_message_id = excluded.starboard_message_id,
          star_count = excluded.star_count,
          author_id = excluded.author_id`,
      )
      .run(params);
  }

  async deleteStarboardEntry(guildId: string, messageId: string) {
    this.connection
      .prepare("DELETE FROM starboard_messages WHERE guild_id = ? AND message_id = ?")
      .run(guildId, messageId);
  }

  async pruneStarboardEntries(guildId: string, olderThan: number) {
    void olderThan;
    this.connection.prepare("DELETE FROM starboard_messages WHERE guild_id = ? AND star_count <= 0").run(guildId);
  }

  // ==================== ECONOMY SYSTEM ====================

  async getEconomyUser(guildId: string, userId: string) {
    const result = this.connection
      .prepare("SELECT * FROM economy_users WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as
      | { guild_id: string; user_id: string; balance: number; last_daily: string | null; last_work: string | null }
      | undefined;

    if (!result) {
      return { guild_id: guildId, user_id: userId, balance: 0, last_daily: null, last_work: null };
    }
    return result;
  }

  async setBalance(guildId: string, userId: string, amount: number) {
    this.connection
      .prepare(
        `INSERT INTO economy_users (guild_id, user_id, balance)
         VALUES (?, ?, ?)
         ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = ?`,
      )
      .run(guildId, userId, amount, amount);
  }

  async addBalance(guildId: string, userId: string, amount: number) {
    this.connection
      .prepare(
        `INSERT INTO economy_users (guild_id, user_id, balance)
         VALUES (?, ?, ?)
         ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = balance + ?`,
      )
      .run(guildId, userId, amount, amount);
    const result = this.connection
      .prepare("SELECT balance FROM economy_users WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { balance: number };
    return result.balance;
  }

  async transferBalance(guildId: string, fromUserId: string, toUserId: string, amount: number) {
    try {
      this.connection.transaction(() => {
        const sender = this.connection
          .prepare("SELECT balance FROM economy_users WHERE guild_id = ? AND user_id = ?")
          .get(guildId, fromUserId) as { balance: number } | undefined;
        if (!sender || sender.balance < amount) {
          throw new Error("Insufficient balance");
        }
        this.connection
          .prepare("UPDATE economy_users SET balance = balance - ? WHERE guild_id = ? AND user_id = ?")
          .run(amount, guildId, fromUserId);
        this.connection
          .prepare(
            `INSERT INTO economy_users (guild_id, user_id, balance)
             VALUES (?, ?, ?)
             ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = balance + ?`,
          )
          .run(guildId, toUserId, amount, amount);
      })();
      return true;
    } catch {
      return false;
    }
  }

  async getEconomyLeaderboard(guildId: string, limit = 10) {
    return this.connection
      .prepare("SELECT guild_id, user_id, balance FROM economy_users WHERE guild_id = ? ORDER BY balance DESC LIMIT ?")
      .all(guildId, limit) as { guild_id: string; user_id: string; balance: number }[];
  }

  async setLastDaily(guildId: string, userId: string) {
    const now = new Date().toISOString();
    this.connection
      .prepare(
        `INSERT INTO economy_users (guild_id, user_id, last_daily)
         VALUES (?, ?, ?)
         ON CONFLICT (guild_id, user_id) DO UPDATE SET last_daily = ?`,
      )
      .run(guildId, userId, now, now);
  }

  async setLastWork(guildId: string, userId: string) {
    const now = new Date().toISOString();
    this.connection
      .prepare(
        `INSERT INTO economy_users (guild_id, user_id, last_work)
         VALUES (?, ?, ?)
         ON CONFLICT (guild_id, user_id) DO UPDATE SET last_work = ?`,
      )
      .run(guildId, userId, now, now);
  }

  // ==================== CRYPTO SYSTEM ====================

  async getCryptoHoldings(guildId: string, userId: string) {
    return this.connection
      .prepare("SELECT * FROM economy_holdings WHERE guild_id = ? AND user_id = ?")
      .all(guildId, userId) as { guild_id: string; user_id: string; crypto: string; amount: number }[];
  }

  async getCryptoHolding(guildId: string, userId: string, crypto: string) {
    return this.connection
      .prepare("SELECT * FROM economy_holdings WHERE guild_id = ? AND user_id = ? AND crypto = ?")
      .get(guildId, userId, crypto) as { guild_id: string; user_id: string; crypto: string; amount: number } | undefined;
  }

  async setCryptoHolding(guildId: string, userId: string, crypto: string, amount: number) {
    if (amount <= 0) {
      this.connection
        .prepare("DELETE FROM economy_holdings WHERE guild_id = ? AND user_id = ? AND crypto = ?")
        .run(guildId, userId, crypto);
    } else {
      this.connection
        .prepare(
          `INSERT INTO economy_holdings (guild_id, user_id, crypto, amount)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (guild_id, user_id, crypto) DO UPDATE SET amount = ?`,
        )
        .run(guildId, userId, crypto, amount, amount);
    }
  }

  async addCryptoHolding(guildId: string, userId: string, crypto: string, amount: number) {
    this.connection
      .prepare(
        `INSERT INTO economy_holdings (guild_id, user_id, crypto, amount)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (guild_id, user_id, crypto) DO UPDATE SET amount = amount + ?`,
      )
      .run(guildId, userId, crypto, amount, amount);
    const result = this.connection
      .prepare("SELECT amount FROM economy_holdings WHERE guild_id = ? AND user_id = ? AND crypto = ?")
      .get(guildId, userId, crypto) as { amount: number };
    return result.amount;
  }

  async getCryptoPrice(guildId: string, crypto: string) {
    const result = this.connection
      .prepare("SELECT price FROM economy_prices WHERE guild_id = ? AND crypto = ?")
      .get(guildId, crypto) as { price: number } | undefined;
    return result?.price ?? 100;
  }

  async setCryptoPrice(guildId: string, crypto: string, price: number) {
    const now = new Date().toISOString();
    this.connection
      .prepare(
        `INSERT INTO economy_prices (guild_id, crypto, price, last_updated)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (guild_id, crypto) DO UPDATE SET price = ?, last_updated = ?`,
      )
      .run(guildId, crypto, price, now, price, now);
  }

  async getAllCryptoPrices(guildId: string) {
    return this.connection.prepare("SELECT * FROM economy_prices WHERE guild_id = ?").all(guildId) as {
      guild_id: string;
      crypto: string;
      price: number;
      last_updated: string;
    }[];
  }

  async getCryptoPriceHistory(guildId: string, crypto: string, limit = 50) {
    return this.connection
      .prepare(
        "SELECT guild_id, crypto, price, recorded_at FROM economy_price_history WHERE guild_id = ? AND crypto = ? ORDER BY recorded_at DESC LIMIT ?",
      )
      .all(guildId, crypto, limit) as { guild_id: string; crypto: string; price: number; recorded_at: string }[];
  }

  async recordCryptoPrice(guildId: string, crypto: string, price: number) {
    this.connection
      .prepare("INSERT INTO economy_price_history (guild_id, crypto, price) VALUES (?, ?, ?)")
      .run(guildId, crypto, price);
  }

  // ==================== TRANSACTION LOG ====================

  async logTransaction(guildId: string, userId: string, type: string, amount: number, crypto?: string, details?: string) {
    this.connection
      .prepare("INSERT INTO economy_transactions (guild_id, user_id, type, amount, crypto, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(guildId, userId, type, amount, crypto ?? null, details ?? null);
  }

  async getTransactions(guildId: string, userId: string, limit = 20) {
    return this.connection
      .prepare("SELECT * FROM economy_transactions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(guildId, userId, limit) as {
        id: number;
        guild_id: string;
        user_id: string;
        type: string;
        amount: number;
        crypto: string | null;
        details: string | null;
        created_at: string;
      }[];
  }

  // ==================== ECONOMY SETTINGS ====================

  async getEconomySettings(guildId: string) {
    const result = this.connection.prepare("SELECT * FROM economy_settings WHERE guild_id = ?").get(guildId) as
      | { guild_id: string; enabled: number; daily_amount: number; work_min: number; work_max: number; work_cooldown: number; daily_cooldown: number }
      | undefined;
    if (!result) {
      return {
        guild_id: guildId,
        enabled: false,
        daily_amount: 100,
        work_min: 10,
        work_max: 50,
        work_cooldown: 3600,
        daily_cooldown: 86400,
      };
    }
    return { ...result, enabled: result.enabled === 1 };
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
    this.connection
      .prepare(
        `INSERT INTO economy_settings (guild_id, enabled, daily_amount, work_min, work_max, work_cooldown, daily_cooldown)
         VALUES (:guild_id, :enabled, :daily_amount, :work_min, :work_max, :work_cooldown, :daily_cooldown)
         ON CONFLICT (guild_id) DO UPDATE SET
           enabled = :enabled,
           daily_amount = :daily_amount,
           work_min = :work_min,
           work_max = :work_max,
           work_cooldown = :work_cooldown,
           daily_cooldown = :daily_cooldown`,
      )
      .run({ ...settings, enabled: settings.enabled ? 1 : 0 });
  }

  async isEconomyEnabled(guildId: string) {
    const result = this.connection.prepare("SELECT enabled FROM economy_settings WHERE guild_id = ?").get(guildId) as
      | { enabled: number }
      | undefined;
    return result?.enabled === 1;
  }

  // ==================== ADMIN MARKET MANIPULATION ====================

  async inflateAllBalances(guildId: string, percentage: number) {
    const multiplier = 1 + percentage / 100;
    const result = this.connection
      .prepare("UPDATE economy_users SET balance = CAST(balance * ? AS INTEGER) WHERE guild_id = ?")
      .run(multiplier, guildId);
    return typeof result === "number" ? result : result.changes;
  }

  async wipeUserEconomy(guildId: string, userId: string) {
    this.connection.prepare("DELETE FROM economy_users WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
    this.connection.prepare("DELETE FROM economy_holdings WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
  }

  async wipeCrypto(guildId: string, crypto?: string) {
    if (crypto) {
      this.connection.prepare("DELETE FROM economy_holdings WHERE guild_id = ? AND crypto = ?").run(guildId, crypto);
      this.connection.prepare("DELETE FROM economy_prices WHERE guild_id = ? AND crypto = ?").run(guildId, crypto);
    } else {
      this.connection.prepare("DELETE FROM economy_holdings WHERE guild_id = ?").run(guildId);
      this.connection.prepare("DELETE FROM economy_prices WHERE guild_id = ?").run(guildId);
    }
  }

  // ==================== TICKET SYSTEM ====================

  async getTicket(channelId: string) {
    return this.connection.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId) as
      | {
        id: number;
        guild_id: string;
        channel_id: string;
        user_id: string;
        category: string;
        status: string;
        claimed_by: string | null;
        created_at: string;
        closed_at: string | null;
        close_reason: string | null;
      }
      | undefined;
  }

  async getTicketById(ticketId: number) {
    return this.connection.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as
      | {
        id: number;
        guild_id: string;
        channel_id: string;
        user_id: string;
        category: string;
        status: string;
        claimed_by: string | null;
        created_at: string;
        closed_at: string | null;
        close_reason: string | null;
      }
      | undefined;
  }

  async createTicket(guildId: string, channelId: string, userId: string, category = "general") {
    const result = this.connection
      .prepare("INSERT INTO tickets (guild_id, channel_id, user_id, category) VALUES (?, ?, ?, ?)")
      .run(guildId, channelId, userId, category);
    return (typeof result === "number" ? result : result.lastInsertRowid) as number;
  }

  async claimTicket(channelId: string, staffId: string) {
    this.connection
      .prepare("UPDATE tickets SET claimed_by = ?, status = 'claimed' WHERE channel_id = ?")
      .run(staffId, channelId);
  }

  async closeTicket(channelId: string, reason?: string) {
    const now = new Date().toISOString();
    this.connection
      .prepare("UPDATE tickets SET status = 'closed', closed_at = ?, close_reason = ? WHERE channel_id = ?")
      .run(now, reason ?? null, channelId);
  }

  async getOpenTickets(guildId: string) {
    return this.connection
      .prepare("SELECT * FROM tickets WHERE guild_id = ? AND status != 'closed' ORDER BY created_at ASC")
      .all(guildId) as {
        id: number;
        guild_id: string;
        channel_id: string;
        user_id: string;
        category: string;
        status: string;
        claimed_by: string | null;
        created_at: string;
      }[];
  }

  async getUserTickets(guildId: string, userId: string) {
    return this.connection
      .prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status != 'closed'")
      .all(guildId, userId) as {
        id: number;
        guild_id: string;
        channel_id: string;
        user_id: string;
        category: string;
        status: string;
        claimed_by: string | null;
        created_at: string;
      }[];
  }

  async getTicketSettings(guildId: string) {
    const result = this.connection.prepare("SELECT * FROM ticket_settings WHERE guild_id = ?").get(guildId) as
      | {
        guild_id: string;
        enabled: number;
        category_id: string | null;
        support_role_id: string | null;
        log_channel_id: string | null;
        ticket_message: string | null;
        auto_close_hours: number | null;
        max_open_per_user: number;
      }
      | undefined;
    if (!result) {
      return {
        guild_id: guildId,
        enabled: false,
        category_id: null,
        support_role_id: null,
        log_channel_id: null,
        ticket_message: null,
        auto_close_hours: null,
        max_open_per_user: 1,
      };
    }
    return { ...result, enabled: result.enabled === 1 };
  }

  async setTicketSettings(settings: {
    guild_id: string;
    enabled: boolean;
    category_id: string | null;
    support_role_id: string | null;
    log_channel_id: string | null;
    ticket_message: string | null;
    auto_close_hours: number | null;
    max_open_per_user: number;
  }) {
    this.connection
      .prepare(
        `INSERT INTO ticket_settings (guild_id, enabled, category_id, support_role_id, log_channel_id, ticket_message, auto_close_hours, max_open_per_user)
         VALUES (:guild_id, :enabled, :category_id, :support_role_id, :log_channel_id, :ticket_message, :auto_close_hours, :max_open_per_user)
         ON CONFLICT (guild_id) DO UPDATE SET
           enabled = :enabled,
           category_id = :category_id,
           support_role_id = :support_role_id,
           log_channel_id = :log_channel_id,
           ticket_message = :ticket_message,
           auto_close_hours = :auto_close_hours,
           max_open_per_user = :max_open_per_user`,
      )
      .run({ ...settings, enabled: settings.enabled ? 1 : 0 });
  }

  async isTicketsEnabled(guildId: string) {
    const result = this.connection.prepare("SELECT enabled FROM ticket_settings WHERE guild_id = ?").get(guildId) as
      | { enabled: number }
      | undefined;
    return result?.enabled === 1;
  }

  // ==================== REPUTATION SYSTEM ====================

  async giveRep(guildId: string, userId: string, fromUserId: string, amount: number, reason?: string) {
    const result = this.connection
      .prepare("INSERT INTO reputation (guild_id, user_id, from_user_id, amount, reason) VALUES (?, ?, ?, ?, ?)")
      .run(guildId, userId, fromUserId, amount, reason ?? null);
    return (typeof result === "number" ? result : result.lastInsertRowid) as number;
  }

  async getRepScore(guildId: string, userId: string) {
    const result = this.connection
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM reputation WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { total: number } | undefined;
    return result?.total ?? 0;
  }

  async getRepHistory(guildId: string, userId: string, limit = 10) {
    return this.connection
      .prepare("SELECT id, from_user_id, amount, reason, created_at FROM reputation WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(guildId, userId, limit) as { id: number; from_user_id: string; amount: number; reason: string | null; created_at: string }[];
  }

  async getRepLeaderboard(guildId: string, limit = 10) {
    return this.connection
      .prepare("SELECT user_id, SUM(amount) as total FROM reputation WHERE guild_id = ? GROUP BY user_id ORDER BY total DESC LIMIT ?")
      .all(guildId, limit) as { user_id: string; total: number }[];
  }

  async canGiveRep(guildId: string, fromUserId: string, toUserId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = this.connection
      .prepare("SELECT COUNT(*) as count FROM reputation WHERE guild_id = ? AND from_user_id = ? AND user_id = ? AND created_at > ?")
      .get(guildId, fromUserId, toUserId, oneDayAgo) as { count: number };
    return result.count === 0;
  }

  // ==================== BIRTHDAY SYSTEM ====================

  async setBirthday(guildId: string, userId: string, month: number, day: number, year?: number) {
    this.connection
      .prepare(
        `INSERT INTO birthdays (guild_id, user_id, birth_month, birth_day, birth_year)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (guild_id, user_id) DO UPDATE SET
           birth_month = ?, birth_day = ?, birth_year = ?`
      )
      .run(guildId, userId, month, day, year ?? null, month, day, year ?? null);
  }

  async removeBirthday(guildId: string, userId: string) {
    this.connection.prepare("DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
  }

  async getBirthday(guildId: string, userId: string) {
    return this.connection
      .prepare("SELECT * FROM birthdays WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { guild_id: string; user_id: string; birth_month: number; birth_day: number; birth_year: number | null } | undefined;
  }

  async getTodaysBirthdays(guildId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return this.connection
      .prepare("SELECT user_id, birth_year FROM birthdays WHERE guild_id = ? AND birth_month = ? AND birth_day = ?")
      .all(guildId, month, day) as { user_id: string; birth_year: number | null }[];
  }

  async getUpcomingBirthdays(guildId: string, days = 30) {
    const now = new Date();
    const results = this.connection
      .prepare("SELECT user_id, birth_month, birth_day, birth_year FROM birthdays WHERE guild_id = ?")
      .all(guildId) as { user_id: string; birth_month: number; birth_day: number; birth_year: number | null }[];

    const upcoming = results.filter(b => {
      const thisYear = now.getFullYear();
      let bday = new Date(thisYear, b.birth_month - 1, b.birth_day);
      if (bday < now) bday = new Date(thisYear + 1, b.birth_month - 1, b.birth_day);
      const diffDays = Math.ceil((bday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    }).sort((a, b) => {
      const thisYear = now.getFullYear();
      let dateA = new Date(thisYear, a.birth_month - 1, a.birth_day);
      let dateB = new Date(thisYear, b.birth_month - 1, b.birth_day);
      if (dateA < now) dateA = new Date(thisYear + 1, a.birth_month - 1, a.birth_day);
      if (dateB < now) dateB = new Date(thisYear + 1, b.birth_month - 1, b.birth_day);
      return dateA.getTime() - dateB.getTime();
    });

    return upcoming.slice(0, 10);
  }

  async getBirthdaySettings(guildId: string) {
    const result = this.connection
      .prepare("SELECT * FROM birthday_settings WHERE guild_id = ?")
      .get(guildId) as { guild_id: string; enabled: number; channel_id: string | null; role_id: string | null; message: string | null } | undefined;
    if (!result) {
      return {
        guild_id: guildId,
        enabled: false,
        channel_id: null,
        role_id: null,
        message: null,
      };
    }
    return { ...result, enabled: result.enabled === 1 };
  }

  async setBirthdaySettings(settings: {
    guild_id: string;
    enabled: boolean;
    channel_id: string | null;
    role_id: string | null;
    message: string | null;
  }) {
    this.connection
      .prepare(
        `INSERT INTO birthday_settings (guild_id, enabled, channel_id, role_id, message)
         VALUES (:guild_id, :enabled, :channel_id, :role_id, :message)
         ON CONFLICT (guild_id) DO UPDATE SET
           enabled = :enabled,
           channel_id = :channel_id,
           role_id = :role_id,
           message = :message`
      )
      .run({ ...settings, enabled: settings.enabled ? 1 : 0 });
  }

  // ==================== ANTI-NUKE SYSTEM ====================

  async getAntinukeSettings(guildId: string) {
    const result = this.connection
      .prepare("SELECT * FROM antinuke_settings WHERE guild_id = ?")
      .get(guildId) as {
        guild_id: string;
        enabled: number;
        threshold: number;
        time_window: number;
        log_channel_id: string | null;
        trusted_user: string | null;
        whitelisted_users: string;
        whitelisted_roles: string;
      } | undefined;

    if (!result) {
      return {
        guild_id: guildId,
        enabled: false,
        threshold: 15,
        time_window: 5,
        log_channel_id: null,
        trusted_user: null,
        whitelisted_users: [] as string[],
        whitelisted_roles: [] as string[],
      };
    }

    return {
      guild_id: result.guild_id,
      enabled: result.enabled === 1,
      threshold: result.threshold,
      time_window: result.time_window,
      log_channel_id: result.log_channel_id,
      trusted_user: result.trusted_user,
      whitelisted_users: JSON.parse(result.whitelisted_users) as string[],
      whitelisted_roles: JSON.parse(result.whitelisted_roles) as string[],
    };
  }

  async setAntinukeSettings(settings: {
    guild_id: string;
    enabled: boolean;
    threshold: number;
    time_window: number;
    log_channel_id: string | null;
    trusted_user: string | null;
    whitelisted_users: string[];
    whitelisted_roles: string[];
  }) {
    this.connection
      .prepare(
        `INSERT INTO antinuke_settings (guild_id, enabled, threshold, time_window, log_channel_id, trusted_user, whitelisted_users, whitelisted_roles)
         VALUES (:guild_id, :enabled, :threshold, :time_window, :log_channel_id, :trusted_user, :whitelisted_users, :whitelisted_roles)
         ON CONFLICT (guild_id) DO UPDATE SET
           enabled = :enabled,
           threshold = :threshold,
           time_window = :time_window,
           log_channel_id = :log_channel_id,
           trusted_user = :trusted_user,
           whitelisted_users = :whitelisted_users,
           whitelisted_roles = :whitelisted_roles`
      )
      .run({
        guild_id: settings.guild_id,
        enabled: settings.enabled ? 1 : 0,
        threshold: settings.threshold,
        time_window: settings.time_window,
        log_channel_id: settings.log_channel_id,
        trusted_user: settings.trusted_user,
        whitelisted_users: JSON.stringify(settings.whitelisted_users),
        whitelisted_roles: JSON.stringify(settings.whitelisted_roles),
      });
  }

  async logAntinukeAction(guildId: string, executorId: string, actionType: string, targetId?: string) {
    this.connection
      .prepare("INSERT INTO antinuke_actions (guild_id, executor_id, action_type, target_id) VALUES (?, ?, ?, ?)")
      .run(guildId, executorId, actionType, targetId ?? null);
  }

  async getRecentActions(guildId: string, executorId: string, windowSeconds: number) {
    const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
    return this.connection
      .prepare(
        "SELECT * FROM antinuke_actions WHERE guild_id = ? AND executor_id = ? AND created_at > ? ORDER BY created_at DESC"
      )
      .all(guildId, executorId, cutoff) as {
        id: number;
        guild_id: string;
        executor_id: string;
        action_type: string;
        target_id: string | null;
        created_at: string;
      }[];
  }

  async getOffenseCount(guildId: string, userId: string) {
    const result = this.connection
      .prepare("SELECT offense_count FROM antinuke_offenses WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { offense_count: number } | undefined;
    return result?.offense_count ?? 0;
  }

  async incrementOffense(guildId: string, userId: string) {
    const now = new Date().toISOString();
    const existing = this.connection
      .prepare("SELECT offense_count FROM antinuke_offenses WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { offense_count: number } | undefined;

    if (existing) {
      const newCount = existing.offense_count + 1;
      this.connection
        .prepare("UPDATE antinuke_offenses SET offense_count = ?, last_offense = ? WHERE guild_id = ? AND user_id = ?")
        .run(newCount, now, guildId, userId);
      return newCount;
    } else {
      this.connection
        .prepare("INSERT INTO antinuke_offenses (guild_id, user_id, offense_count, last_offense) VALUES (?, ?, ?, ?)")
        .run(guildId, userId, 1, now);
      return 1;
    }
  }

  async addToAntinukeWhitelist(guildId: string, type: "users" | "roles", id: string) {
    const settings = await this.getAntinukeSettings(guildId);
    const list = type === "users" ? settings.whitelisted_users : settings.whitelisted_roles;
    if (!list.includes(id)) {
      list.push(id);
      if (type === "users") {
        settings.whitelisted_users = list;
      } else {
        settings.whitelisted_roles = list;
      }
      await this.setAntinukeSettings(settings);
    }
  }

  async removeFromAntinukeWhitelist(guildId: string, type: "users" | "roles", id: string) {
    const settings = await this.getAntinukeSettings(guildId);
    if (type === "users") {
      settings.whitelisted_users = settings.whitelisted_users.filter(u => u !== id);
    } else {
      settings.whitelisted_roles = settings.whitelisted_roles.filter(r => r !== id);
    }
    await this.setAntinukeSettings(settings);
  }

  async clearAntinukeActions(guildId: string, olderThanSeconds?: number) {
    if (olderThanSeconds) {
      const cutoff = new Date(Date.now() - olderThanSeconds * 1000).toISOString();
      this.connection
        .prepare("DELETE FROM antinuke_actions WHERE guild_id = ? AND created_at < ?")
        .run(guildId, cutoff);
    } else {
      this.connection.prepare("DELETE FROM antinuke_actions WHERE guild_id = ?").run(guildId);
    }
  }
}
