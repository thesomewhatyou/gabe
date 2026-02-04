import type { ApplicationCommandOptions, Client, Constants } from "oceanic.js";
import type Command from "#cmd-classes/command.js";
import type { DatabasePlugin } from "../database.ts";

export interface DBGuild {
  guild_id: string;
  prefix: string;
  disabled: string[];
  disabled_commands: string[];
  tag_roles: string[];
}

export interface StarboardSettings {
  guild_id: string;
  channel_id: string | null;
  emoji: string;
  threshold: number;
  allow_self: boolean;
  allow_bots: boolean;
  enabled: boolean;
}

export interface StarboardEntry {
  guild_id: string;
  message_id: string;
  channel_id: string;
  starboard_message_id: string | null;
  star_count: number;
  author_id: string;
}

export interface Tag {
  name: string;
  content: string;
  author: string;
}

export interface Count {
  command: string;
  count: number;
}

export interface CommandsConfig {
  types: {
    classic: boolean;
    application: boolean;
  };
  blacklist: string[];
  guildCommands?: string[];
}

type ValueOrNested<T> = T | { [x: string]: ValueOrNested<T> };

export type CommandEntry = Record<string, ValueOrNested<typeof Command>>;

export type CommandType = "classic" | "application";

export type ExtendedCommandOptions = {
  classic?: boolean;
} & ApplicationCommandOptions;

export type Param =
  | {
      name: string;
      desc: string;
      params: Param[];
    }
  | string;

export interface CommandInfo {
  category: string;
  description: string;
  aliases: string[];
  params: Param[];
  flags: ExtendedCommandOptions[];
  slashAllowed: boolean;
  directAllowed: boolean;
  userAllowed: boolean;
  baseCommand: boolean;
  adminOnly: boolean;
  guildCommand: boolean;
  type: Constants.ApplicationCommandTypes;
}

export interface ImageParams {
  cmd: string;
  params: {
    [key: string]: string | number | boolean;
  };
  input?: {
    data?: ArrayBuffer;
    type?: string;
  };
  id: string;
  path?: string;
  url?: string;
  name?: string;
  onlyAnim?: boolean;
  ephemeral?: boolean;
  spoiler?: boolean;
  token?: string;
}

export interface ImageTypeData {
  url?: string;
  type?: string;
}

export interface SearXNGResults {
  query: string;
  results: {
    author?: string;
    img_src?: string;
    title: string;
    url: string;
  }[];
}

export interface EventParams {
  client: Client;
  database: DatabasePlugin | undefined;
}

export function isError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export type StarboardDirection = "add" | "remove";

export interface AntinukeSettings {
  guild_id: string;
  enabled: boolean;
  threshold: number;
  time_window: number;
  log_channel_id: string | null;
  trusted_user: string | null;
  whitelisted_users: string[];
  whitelisted_roles: string[];
}

export interface AntinukeOffense {
  guild_id: string;
  user_id: string;
  offense_count: number;
  last_offense: string | null;
}

// Image Battles types
export type BattleStatus = "submissions" | "voting" | "completed" | "cancelled";

export interface Battle {
  id: number;
  guild_id: string;
  channel_id: string;
  host_id: string;
  theme: string;
  status: BattleStatus;
  submission_end: string;
  voting_end: string | null;
  created_at: string;
  message_id: string | null;
  winner_id: string | null;
}

export interface BattleSubmission {
  id: number;
  battle_id: number;
  user_id: string;
  image_url: string;
  submitted_at: string;
  votes: number;
}

export interface BattleVote {
  battle_id: number;
  voter_id: string;
  submission_id: number;
  voted_at: string;
}

export interface BattleStats {
  guild_id: string;
  user_id: string;
  wins: number;
  participations: number;
  total_votes_received: number;
}
