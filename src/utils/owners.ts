import process from "node:process";

/**
 * Returns the configured list of owner IDs, trimmed of whitespace and empty entries.
 */
export function getOwners(): string[] {
  return (process.env.OWNER ?? "")
    .split(",")
    .map((owner) => owner.trim())
    .filter((owner) => owner.length > 0);
}

/**
 * Convenience helper to check if a user ID matches the configured owners.
 */
export function isOwner(id?: string | null): boolean {
  if (!id) return false;
  return getOwners().includes(id);
}
