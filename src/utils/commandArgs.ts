export function cleanDiscordId(arg: unknown): unknown {
  return typeof arg === "string" ? arg.trim().replace(/[<@#!&>]/g, "") : arg;
}

export function parseDiscordSnowflakeArg(arg: unknown): string | undefined {
  const value = cleanDiscordId(arg);
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;

  try {
    return BigInt(value) >= 21154535154122752n ? value : undefined;
  } catch {
    return undefined;
  }
}

export function parseBooleanArg(arg: unknown): boolean | undefined {
  if (typeof arg === "boolean") return arg;
  if (typeof arg !== "string") return undefined;

  const value = arg.trim().toLowerCase();
  if (["true", "on", "yes", "enable", "enabled", "1"].includes(value)) return true;
  if (["false", "off", "no", "disable", "disabled", "0"].includes(value)) return false;
  return undefined;
}

export function parseIntegerArg(arg: unknown): number | undefined {
  const value = String(arg ?? "").trim();
  if (!/^-?\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseFirstIntegerArg(args: unknown[] | undefined): number | undefined {
  for (const arg of args ?? []) {
    const parsed = parseIntegerArg(arg);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

export function parseNumberArg(arg: unknown): number | undefined {
  const value = String(arg ?? "").trim();
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
