/**
 * Event handler for role deletions
 * Monitors for mass role deletions and triggers anti-nuke response
 */

import { Constants, type Role } from "oceanic.js";
import { checkAndLogAction, handleThreat, handleOwnerThreat, isWhitelisted } from "#utils/antinuke.js";
import logger from "#utils/logger.js";
import type { EventParams } from "#utils/types.js";

export default async ({ client, database }: EventParams, role: Role) => {
    if (!database) return;

    try {
        const guild = client.guilds.get(role.guildID);
        if (!guild) return;

        const settings = await database.getAntinukeSettings(guild.id);
        if (!settings.enabled) return;

        // Get the audit log to find who deleted the role
        const auditLog = await client.rest.guilds.getAuditLog(guild.id, {
            actionType: Constants.AuditLogActionTypes.ROLE_DELETE,
            limit: 1,
        });

        const entry = auditLog.entries[0];
        if (!entry || !entry.user) return;

        // Check if this entry matches the deleted role
        if (entry.targetID !== role.id) return;

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
        const { exceeded, count } = await checkAndLogAction(database, guild.id, executorId, "role_delete", role.id);

        if (exceeded) {
            logger.warn(`Anti-nuke: Mass role deletion detected in ${guild.id} by ${executorId} (${count} roles)`);

            if (isOwner) {
                await handleOwnerThreat(client, database, guild);
            } else {
                await handleThreat(client, database, guild, executorId, "mass_role_delete");
            }
        }
    } catch (error) {
        logger.error(`Anti-nuke roleDelete error: ${(error as Error).stack || error}`);
    }
};
