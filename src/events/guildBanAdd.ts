/**
 * Event handler for guild ban additions
 * Monitors for mass bans and triggers anti-nuke response
 */

import { Constants, type Guild, type User } from "oceanic.js";
import { checkAndLogAction, handleThreat, handleOwnerThreat, isWhitelisted } from "#utils/antinuke.js";
import logger from "#utils/logger.js";
import type { EventParams } from "#utils/types.js";

export default async ({ client, database }: EventParams, guild: Guild, user: User) => {
    if (!database) return;

    try {
        const settings = await database.getAntinukeSettings(guild.id);
        if (!settings.enabled) return;

        // Get the audit log to find who performed the ban
        const auditLog = await client.rest.guilds.getAuditLog(guild.id, {
            actionType: Constants.AuditLogActionTypes.MEMBER_BAN_ADD,
            limit: 1,
        });

        const entry = auditLog.entries[0];
        if (!entry || !entry.user) return;

        // Check if this entry matches the banned user
        if (entry.targetID !== user.id) return;

        const executorId = entry.user.id;

        // Skip if it's the bot itself
        if (executorId === client.user.id) return;

        // Skip if executor is the owner (handled separately)
        const isOwner = executorId === guild.ownerID;

        // Check whitelist (trusted user is always exempt)
        const executor = guild.members.get(executorId);
        const executorRoles = executor?.roles ?? [];

        if (!isOwner && await isWhitelisted(database, guild.id, executorId, executorRoles)) {
            return;
        }

        // Log and check threshold
        const { exceeded, count } = await checkAndLogAction(database, guild.id, executorId, "ban", user.id);

        if (exceeded) {
            logger.warn(`Anti-nuke: Mass ban detected in ${guild.id} by ${executorId} (${count} bans)`);

            if (isOwner) {
                // Owner is nuking - special handling
                await handleOwnerThreat(client, database, guild);
            } else {
                // Regular user - escalating response
                await handleThreat(client, database, guild, executorId, "mass_ban");
            }
        }
    } catch (error) {
        logger.error(`Anti-nuke guildBanAdd error: ${(error as Error).stack || error}`);
    }
};
