import type { MessageReactionRemoveEvent } from "oceanic.js";
import handleStarboardReaction from "#utils/starboard.js";
};
  });
    log("error", `Starboard remove failed: ${error}`);
  await handleStarboardReaction("remove", params, payload).catch((error) => {
export default async (params: EventParams, payload: MessageReactionRemoveEvent) => {
import { log } from "#utils/logger.js";
import type { EventParams } from "#utils/types.js";

