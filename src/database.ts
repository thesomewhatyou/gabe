// wrapper for the database drivers in ./database/
import "dotenv/config";
import process from "node:process";
import type { Guild, GuildChannel } from "oceanic.js";
import detectRuntime from "#utils/detectRuntime.js";
import logger from "#utils/logger.js";
import {
  type Battle,
  type BattleStats,
  type BattleSubmission,
  type DBGuild,
  isError,
  type StarboardEntry,
  type StarboardSettings,
  type Tag,
} from "#utils/types.js";

export interface DatabasePlugin {
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
  ) => Promise<{
    guild_id: string;
    user_id: string;
    balance: number;
    last_daily: Date | string | null;
    last_work: Date | string | null;
  }>;
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
  getAllCryptoPrices: (
    guildId: string,
  ) => Promise<{ guild_id: string; crypto: string; price: number; last_updated: Date | string }[]>;
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
  ) => Promise<
    {
      id: number;
      guild_id: string;
      user_id: string;
      type: string;
      amount: number;
      crypto: string | null;
      details: string | null;
      created_at: Date | string;
    }[]
  >;
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
  // Ticket system
  getTicket: (channelId: string) => Promise<
    | {
        id: number;
        guild_id: string;
        channel_id: string;
        user_id: string;
        category: string;
        status: string;
        claimed_by: string | null;
        created_at: Date | string;
        closed_at: Date | string | null;
        close_reason: string | null;
      }
    | undefined
  >;
  getTicketById: (ticketId: number) => Promise<
    | {
        id: number;
        guild_id: string;
        channel_id: string;
        user_id: string;
        category: string;
        status: string;
        claimed_by: string | null;
        created_at: Date | string;
        closed_at: Date | string | null;
        close_reason: string | null;
      }
    | undefined
  >;
  createTicket: (guildId: string, channelId: string, userId: string, category?: string) => Promise<number>;
  claimTicket: (channelId: string, staffId: string) => Promise<void>;
  closeTicket: (channelId: string, reason?: string) => Promise<void>;
  getOpenTickets: (guildId: string) => Promise<
    {
      id: number;
      guild_id: string;
      channel_id: string;
      user_id: string;
      category: string;
      status: string;
      claimed_by: string | null;
      created_at: Date | string;
    }[]
  >;
  getUserTickets: (
    guildId: string,
    userId: string,
  ) => Promise<
    {
      id: number;
      guild_id: string;
      channel_id: string;
      user_id: string;
      category: string;
      status: string;
      claimed_by: string | null;
      created_at: Date | string;
    }[]
  >;
  getTicketSettings: (guildId: string) => Promise<{
    guild_id: string;
    enabled: boolean;
    category_id: string | null;
    support_role_id: string | null;
    log_channel_id: string | null;
    ticket_message: string | null;
    auto_close_hours: number | null;
    max_open_per_user: number;
  }>;
  setTicketSettings: (settings: {
    guild_id: string;
    enabled: boolean;
    category_id: string | null;
    support_role_id: string | null;
    log_channel_id: string | null;
    ticket_message: string | null;
    auto_close_hours: number | null;
    max_open_per_user: number;
  }) => Promise<void>;
  isTicketsEnabled: (guildId: string) => Promise<boolean>;
  // Reputation system
  giveRep: (guildId: string, userId: string, fromUserId: string, amount: number, reason?: string) => Promise<number>;
  getRepScore: (guildId: string, userId: string) => Promise<number>;
  getRepHistory: (
    guildId: string,
    userId: string,
    limit?: number,
  ) => Promise<
    { id: number; from_user_id: string; amount: number; reason: string | null; created_at: Date | string }[]
  >;
  getRepLeaderboard: (guildId: string, limit?: number) => Promise<{ user_id: string; total: number | string }[]>;
  canGiveRep: (guildId: string, fromUserId: string, toUserId: string) => Promise<boolean>;
  // Birthday system
  setBirthday: (guildId: string, userId: string, month: number, day: number, year?: number) => Promise<void>;
  removeBirthday: (guildId: string, userId: string) => Promise<void>;
  getBirthday: (
    guildId: string,
    userId: string,
  ) => Promise<
    { guild_id: string; user_id: string; birth_month: number; birth_day: number; birth_year: number | null } | undefined
  >;
  getTodaysBirthdays: (guildId: string) => Promise<{ user_id: string; birth_year: number | null }[]>;
  getUpcomingBirthdays: (
    guildId: string,
    days?: number,
  ) => Promise<{ user_id: string; birth_month: number; birth_day: number; birth_year: number | null }[]>;
  getBirthdaySettings: (guildId: string) => Promise<{
    guild_id: string;
    enabled: boolean;
    channel_id: string | null;
    role_id: string | null;
    message: string | null;
  }>;
  setBirthdaySettings: (settings: {
    guild_id: string;
    enabled: boolean;
    channel_id: string | null;
    role_id: string | null;
    message: string | null;
  }) => Promise<void>;
  // Anti-nuke system
  getAntinukeSettings: (guildId: string) => Promise<{
    guild_id: string;
    enabled: boolean;
    threshold: number;
    time_window: number;
    log_channel_id: string | null;
    trusted_user: string | null;
    whitelisted_users: string[];
    whitelisted_roles: string[];
  }>;
  setAntinukeSettings: (settings: {
    guild_id: string;
    enabled: boolean;
    threshold: number;
    time_window: number;
    log_channel_id: string | null;
    trusted_user: string | null;
    whitelisted_users: string[];
    whitelisted_roles: string[];
  }) => Promise<void>;
  logAntinukeAction: (guildId: string, executorId: string, actionType: string, targetId?: string) => Promise<void>;
  getRecentActions: (
    guildId: string,
    executorId: string,
    windowSeconds: number,
  ) => Promise<
    {
      id: number;
      guild_id: string;
      executor_id: string;
      action_type: string;
      target_id: string | null;
      created_at: string;
    }[]
  >;
  getOffenseCount: (guildId: string, userId: string) => Promise<number>;
  incrementOffense: (guildId: string, userId: string) => Promise<number>;
  addToAntinukeWhitelist: (guildId: string, type: "users" | "roles", id: string) => Promise<void>;
  removeFromAntinukeWhitelist: (guildId: string, type: "users" | "roles", id: string) => Promise<void>;
  clearAntinukeActions: (guildId: string, olderThanSeconds?: number) => Promise<void>;
  // Image Battles system
  createBattle: (
    guildId: string,
    channelId: string,
    hostId: string,
    theme: string,
    submissionMinutes: number,
  ) => Promise<Battle>;
  getBattle: (battleId: number) => Promise<Battle | undefined>;
  getActiveBattle: (guildId: string) => Promise<Battle | undefined>;
  updateBattleStatus: (battleId: number, status: string, votingEnd?: string) => Promise<void>;
  updateBattleMessage: (battleId: number, messageId: string) => Promise<void>;
  setBattleWinner: (battleId: number, winnerId: string) => Promise<void>;
  addSubmission: (battleId: number, userId: string, imageUrl: string) => Promise<BattleSubmission>;
  getSubmissions: (battleId: number) => Promise<BattleSubmission[]>;
  getSubmission: (battleId: number, userId: string) => Promise<BattleSubmission | undefined>;
  hasVoted: (battleId: number, voterId: string) => Promise<boolean>;
  addVote: (battleId: number, voterId: string, submissionId: number) => Promise<void>;
  getVoteCounts: (battleId: number) => Promise<{ submission_id: number; votes: number }[]>;
  getBattleStats: (guildId: string, userId: string) => Promise<BattleStats>;
  updateBattleStats: (guildId: string, userId: string, won: boolean, votesReceived: number) => Promise<void>;
  getBattleLeaderboard: (guildId: string, limit?: number) => Promise<BattleStats[]>;
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
