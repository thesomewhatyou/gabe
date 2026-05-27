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
