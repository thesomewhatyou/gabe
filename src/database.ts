// wrapper for the database drivers in ./database/
import "dotenv/config";
import process from "node:process";
import type { Guild, GuildChannel } from "oceanic.js";
import detectRuntime from "#utils/detectRuntime.js";
import logger from "#utils/logger.js";
import { type DBGuild, isError, type Tag } from "#utils/types.js";

export declare class DatabasePlugin {
  constructor(connectString: string);
  setup: () => Promise<void>;
  stop: () => Promise<void>;
  upgrade: () => Promise<number | undefined>;
  addCount: (command: string) => Promise<void>;
  getCounts: (all?: boolean) => Promise<Map<string, number>>;
  disableCommand: (guild: string, command: string) => Promise<void>;
  enableCommand: (guild: string, command: string) => Promise<void>;
  disableChannel: (channel: GuildChannel) => Promise<void>;
  enableChannel: (channel: GuildChannel) => Promise<void>;
  getTag: (guild: string, tag: string) => Promise<Tag | undefined>;
  getTags: (guild: string) => Promise<Record<string, Tag>>;
  setTag: (tag: Tag, guild: Guild) => Promise<void>;
  removeTag: (name: string, guild: Guild) => Promise<void>;
  editTag: (tag: Tag, guild: Guild) => Promise<void>;
  addTagRole: (guild: string, role: string) => Promise<void>;
  removeTagRole: (guild: string, role: string) => Promise<void>;
  setBroadcast: (msg?: string) => Promise<void>;
  getBroadcast: () => Promise<string | undefined>;
  setPrefix: (prefix: string, guild: Guild) => Promise<void>;
  getGuild: (query: string) => Promise<DBGuild>;
  getUserPreferences: (userId: string) => Promise<{ user_id: string; locale: string | null; dm_notifications: boolean }>;
  setUserPreference: (userId: string, key: "locale" | "dm_notifications", value: string | boolean | null) => Promise<void>;
  addModLog: (guildId: string, userId: string, moderatorId: string, action: string, reason?: string) => Promise<void>;
  getModLogs: (guildId: string, userId?: string, limit?: number) => Promise<{ id: number; guild_id: string; user_id: string; moderator_id: string; action: string; reason: string | null; created_at: string | Date }[]>;
  addWarning: (guildId: string, userId: string, moderatorId: string, reason: string) => Promise<number>;
  getWarnings: (guildId: string, userId: string) => Promise<{ id: number; guild_id: string; user_id: string; moderator_id: string; reason: string; created_at: string | Date }[]>;
  removeWarning: (guildId: string, warningId: number) => Promise<boolean>;
  clearWarnings: (guildId: string, userId: string) => Promise<number>;
}

export async function init(): Promise<DatabasePlugin | undefined> {
  if (process.env.DB && process.env.DB.length !== 0) {
    const dbtype = process.env.DB.split("://")[0];
    try {
      const construct = (await import(`./database/${dbtype}.${detectRuntime().tsLoad ? "ts" : "js"}`)).default;
      return new construct(process.env.DB);
    } catch (error) {
      if (isError(error) && error.code === "ERR_MODULE_NOT_FOUND") {
        logger.error(`DB config option has unknown database type '${dbtype}'`);
      }
      throw error;
    }
  } else {
    logger.warn("No database configured, running in stateless mode...");
    return;
  }
}
