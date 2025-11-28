import type { MessageReactionAddEvent } from "oceanic.js";
import type { EventParams } from "#utils/types.js";
import { getString } from "#utils/i18n.js";
import { log } from "#utils/logger.js";
import handleStarboardReaction from "#utils/starboard.js";

export default async (params: EventParams, payload: MessageReactionAddEvent) => {
  await handleStarboardReaction("add", params, payload).catch((error) => {
    log("error", `Starboard add failed: ${error}`);
  });
};
