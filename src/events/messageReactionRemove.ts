import type { EventReaction, Member, PossiblyUncachedMessage, Uncached, User } from "oceanic.js";
import { log } from "#utils/logger.js";
import type { EventParams } from "#utils/types.js";
import handleStarboardReaction from "#utils/starboard.js";

export default async (
  params: EventParams,
  message: PossiblyUncachedMessage & { author?: User | Uncached; member?: Member | Uncached },
  reactor: Member | User | Uncached,
  reaction: EventReaction,
) => {
  await handleStarboardReaction("remove", params, message, reactor, reaction).catch((error) => {
    log("error", `Starboard remove failed: ${error}`);
  });
};

