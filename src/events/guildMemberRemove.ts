/**
 * Event handler for guild member removals
 * Monitors for mass kicks and triggers anti-nuke response
 * (Distinguishes kicks from leaves by checking audit log)
 */

import { Constants, type Guild, type Member, type User } from "oceanic.js";
import { checkAndLogAction, handleThreat, handleOwnerThreat, isWhitelisted } from "#utils/antinuke.js";
import logger from "#utils/logger.js";
import type { EventParams } from "#utils/types.js";

export default async ({ client, database }: EventParams, member: Member | { id: string; guild: Guild }, guild: Guild) => {
    if (!database) return;

    try {
        const settings = await database.getAntinukeSettings(guild.id);
        if (!settings.enabled) return;

        // Get the audit log to check if this was a kick (not a leave or ban)
        const auditLog = await client.rest.guilds.getAuditLog(guild.id, {
            actionType: Constants.AuditLogActionTypes.MEMBER_KICK,
            limit: 5,
        });

        // Find an entry that matches this user and is recent (within 5 seconds)
        const now = Date.now();
        const userId = "id" in member ? member.id : (member as Member).id;

        const entry = auditLog.entries.find((e) => {
            if (e.targetID !== userId) return false;
            // Check if entry is recent (entry.id is a snowflake, convert to timestamp)
            const entryTime = Number((BigInt(e.id) >> 22n) + 1420070400000n);
            return now - entryTime < 5000; // Within 5 seconds
        });

        // Not a kick (user left voluntarily or was banned)
        if (!entry || !entry.user) return;

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
        const { exceeded, count } = await checkAndLogAction(database, guild.id, executorId, "kick", userId);

        if (exceeded) {
            logger.warn(`Anti-nuke: Mass kick detected in ${guild.id} by ${executorId} (${count} kicks)`);

            if (isOwner) {
                await handleOwnerThreat(client, database, guild);
            } else {
                await handleThreat(client, database, guild, executorId, "mass_kick");
            }
        }
    } catch (error) {
        logger.error(`Anti-nuke guildMemberRemove error: ${(error as Error).stack || error}`);
    }
};
