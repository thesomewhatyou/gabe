import type { Client, Guild, Member, User } from "oceanic.js";
import { mentionToObject } from "./mentions.ts";

interface JoyUserContext {
  client: Client;
  guild?: Guild | null;
  options?: Record<string, unknown>;
  args?: string[];
}

export function cleanJoyInput(input: unknown, maxLength: number) {
  if (!input || typeof input !== "string") return undefined;
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed;
}

export function seededIndex(seed: string, length: number, salt = "") {
  if (length <= 0) return 0;
  let hash = 17 + salt.length;
  const fullSeed = `${salt}:${seed}`;
  for (let i = 0; i < fullSeed.length; i += 1) {
    hash = (hash * 47 + fullSeed.charCodeAt(i)) % 2147483647;
  }
  return hash % length;
}

export function seededPick<T>(seed: string, list: T[], salt = "") {
  return list[seededIndex(seed, list.length, salt)];
}

export function currentDayKey(now = Date.now()) {
  return Math.floor(now / 86400000);
}

function toUser(entity: Member | User | undefined) {
  if (!entity) return undefined;
  return "user" in entity ? entity.user : entity;
}

export async function resolveJoyUser(context: JoyUserContext, optionName = "user") {
  const optionValue = context.options?.[optionName];
  const raw = typeof optionValue === "string" ? optionValue : context.args?.[0];
  if (!raw) return undefined;

  const entity = await mentionToObject(context.client, raw, "user", {
    guild: context.guild ?? undefined,
  }).catch(() => undefined);

  return toUser(entity);
}
