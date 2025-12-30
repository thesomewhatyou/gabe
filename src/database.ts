// wrapper for the database drivers in ./database/
import "dotenv/config";
import process from "node:process";
import type { Guild, GuildChannel } from "oceanic.js";
import detectRuntime from "#utils/detectRuntime.js";
import logger from "#utils/logger.js";
import { type DBGuild, type StarboardEntry, type StarboardSettings, isError, type Tag } from "#utils/types.js";

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
  getUserPreferences: (
    userId: string,
  ) => Promise<{ user_id: string; locale: string | null; dm_notifications: boolean }>;
  setUserPreference: (
    userId: string,
    key: "locale" | "dm_notifications",
    value: string | boolean | null,
  ) => Promise<void>;
  addModLog: (guildId: string, userId: string, moderatorId: string, action: string, reason?: string) => Promise<void>;
  getModLogs: (
    guildId: string,
    userId?: string,
    limit?: number,
  ) => Promise<
    {
      id: number;
      guild_id: string;
      user_id: string;
      moderator_id: string;
      action: string;
      reason: string | null;
      created_at: string | Date;
    }[]
  >;
  addWarning: (guildId: string, userId: string, moderatorId: string, reason: string) => Promise<number>;
  getWarnings: (
    guildId: string,
    userId: string,
  ) => Promise<
    { id: number; guild_id: string; user_id: string; moderator_id: string; reason: string; created_at: string | Date }[]
  >;
  removeWarning: (guildId: string, warningId: number) => Promise<boolean>;
  clearWarnings: (guildId: string, userId: string) => Promise<number>;
  // Starboard support
  getStarboardSettings: (guildId: string) => Promise<StarboardSettings>;
  setStarboardSettings: (settings: StarboardSettings) => Promise<void>;
  getStarboardEntry: (guildId: string, messageId: string) => Promise<StarboardEntry | undefined>;
  upsertStarboardEntry: (entry: StarboardEntry) => Promise<void>;
  deleteStarboardEntry: (guildId: string, messageId: string) => Promise<void>;
  pruneStarboardEntries: (guildId: string, olderThan: number) => Promise<void>;
  // Leveling system
  getUserLevel: (
    guildId: string,
    userId: string,
  ) => Promise<{ guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: Date | string | null }>;
  addXP: (
    guildId: string,
    userId: string,
    amount: number,
  ) => Promise<{ xp: number; level: number; leveledUp: boolean }>;
  getLeaderboard: (
    guildId: string,
    limit?: number,
  ) => Promise<{ guild_id: string; user_id: string; xp: number; level: number; last_xp_gain: Date | string | null }[]>;
  setLevelsEnabled: (guildId: string, enabled: boolean) => Promise<void>;
  isLevelsEnabled: (guildId: string) => Promise<boolean>;
  setLevelUpNotifications: (guildId: string, enabled: boolean) => Promise<void>;
  isLevelUpNotificationsEnabled: (guildId: string) => Promise<boolean>;
  // Economy system
  getEconomyUser: (
    guildId: string,
    userId: string,
  ) => Promise<{ guild_id: string; user_id: string; balance: number; last_daily: Date | string | null; last_work: Date | string | null }>;
  setBalance: (guildId: string, userId: string, amount: number) => Promise<void>;
  addBalance: (guildId: string, userId: string, amount: number) => Promise<number>;
  transferBalance: (guildId: string, fromUserId: string, toUserId: string, amount: number) => Promise<boolean>;
  getEconomyLeaderboard: (
    guildId: string,
    limit?: number,
  ) => Promise<{ guild_id: string; user_id: string; balance: number }[]>;
  setLastDaily: (guildId: string, userId: string) => Promise<void>;
  setLastWork: (guildId: string, userId: string) => Promise<void>;
  // Crypto system
  getCryptoHoldings: (
    guildId: string,
    userId: string,
  ) => Promise<{ guild_id: string; user_id: string; crypto: string; amount: number }[]>;
  getCryptoHolding: (
    guildId: string,
    userId: string,
    crypto: string,
  ) => Promise<{ guild_id: string; user_id: string; crypto: string; amount: number } | undefined>;
  setCryptoHolding: (guildId: string, userId: string, crypto: string, amount: number) => Promise<void>;
  addCryptoHolding: (guildId: string, userId: string, crypto: string, amount: number) => Promise<number>;
  getCryptoPrice: (guildId: string, crypto: string) => Promise<number>;
  setCryptoPrice: (guildId: string, crypto: string, price: number) => Promise<void>;
  getAllCryptoPrices: (guildId: string) => Promise<{ guild_id: string; crypto: string; price: number; last_updated: Date | string }[]>;
  getCryptoPriceHistory: (
    guildId: string,
    crypto: string,
    limit?: number,
  ) => Promise<{ guild_id: string; crypto: string; price: number; recorded_at: Date | string }[]>;
  recordCryptoPrice: (guildId: string, crypto: string, price: number) => Promise<void>;
  // Economy transactions log
  logTransaction: (
    guildId: string,
    userId: string,
    type: string,
    amount: number,
    crypto?: string,
    details?: string,
  ) => Promise<void>;
  getTransactions: (
    guildId: string,
    userId: string,
    limit?: number,
  ) => Promise<{ id: number; guild_id: string; user_id: string; type: string; amount: number; crypto: string | null; details: string | null; created_at: Date | string }[]>;
  // Economy settings
  getEconomySettings: (guildId: string) => Promise<{
    guild_id: string;
    enabled: boolean;
    daily_amount: number;
    work_min: number;
    work_max: number;
    work_cooldown: number;
    daily_cooldown: number;
  }>;
  setEconomySettings: (settings: {
    guild_id: string;
    enabled: boolean;
    daily_amount: number;
    work_min: number;
    work_max: number;
    work_cooldown: number;
    daily_cooldown: number;
  }) => Promise<void>;
  isEconomyEnabled: (guildId: string) => Promise<boolean>;
  // Market manipulation (admin tools)
  inflateAllBalances: (guildId: string, percentage: number) => Promise<number>;
  wipeUserEconomy: (guildId: string, userId: string) => Promise<void>;
  wipeCrypto: (guildId: string, crypto?: string) => Promise<void>;
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
