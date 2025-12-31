/**
 * Event handler for channel deletions
 * Monitors for mass channel deletions and triggers anti-nuke response
 */

import { Constants, type AnyGuildChannel } from "oceanic.js";
import { checkAndLogAction, handleThreat, handleOwnerThreat, isWhitelisted } from "#utils/antinuke.js";
import logger from "#utils/logger.js";
import type { EventParams } from "#utils/types.js";

export default async ({ client, database }: EventParams, channel: AnyGuildChannel) => {
    if (!database) return;
    if (!("guildID" in channel) || !channel.guildID) return;

    try {
        const guild = client.guilds.get(channel.guildID);
        if (!guild) return;

        const settings = await database.getAntinukeSettings(guild.id);
        if (!settings.enabled) return;

        // Get the audit log to find who deleted the channel
        const auditLog = await client.rest.guilds.getAuditLog(guild.id, {
            actionType: Constants.AuditLogActionTypes.CHANNEL_DELETE,
            limit: 1,
        });

        const entry = auditLog.entries[0];
        if (!entry || !entry.user) return;

        // Check if this entry matches the deleted channel
        if (entry.targetID !== channel.id) return;

        const executorId = entry.user.id;

        // Skip if it's the bot itself
        if (executorId === client.user.id) return;

        // Skip if executor is the owner (handled separately)
        const isOwner = executorId === guild.ownerID;

        // Check whitelist
        const executor = guild.members.get(executorId);
        const executorRoles = executor?.roles ?? [];

        if (!isOwner && await isWhitelisted(database, guild.id, executorId, executorRoles)) {
            return;
        }

        // Log and check threshold
        const { exceeded, count } = await checkAndLogAction(database, guild.id, executorId, "channel_delete", channel.id);

        if (exceeded) {
            logger.warn(`Anti-nuke: Mass channel deletion detected in ${guild.id} by ${executorId} (${count} channels)`);

            if (isOwner) {
                // For owner threat, we don't have a specific channel being nuked here
                // since the channel is already deleted
                await handleOwnerThreat(client, database, guild);
            } else {
                await handleThreat(client, database, guild, executorId, "mass_channel_delete");
            }
        }
    } catch (error) {
        logger.error(`Anti-nuke channelDelete error: ${(error as Error).stack || error}`);
    }
};
