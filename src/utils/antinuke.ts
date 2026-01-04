/**
 * Anti-Nuke Protection System
 *
 * Detects and responds to mass destructive actions (bans, kicks, channel/role deletions).
 * Implements escalating punishment: Mute (30min) → Remove Permissions → Kick
 * Special handling for compromised owner accounts.
 */

import type { Client, Guild, Member, Constants } from "oceanic.js";
import type { DatabasePlugin } from "../database.ts";
import logger from "./logger.js";

// In-memory rate tracking: guild -> executor -> timestamps[]
const actionTracker = new Map<string, Map<string, number[]>>();

// SEPARATE message spam tracking: guild -> user -> timestamps[]
const messageTracker = new Map<string, Map<string, number[]>>();

// Constants
const MUTE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const FALLBACK_ROLE_NAME = "Gabe Fallback Admin";

// Message spam constants (separate from action threshold)
const MESSAGE_SPAM_THRESHOLD = 20;
const MESSAGE_SPAM_WINDOW_MS = 10 * 1000; // 10 seconds

/**
 * Log an action and check if threshold is exceeded
 */
export async function checkAndLogAction(
    database: DatabasePlugin,
    guildId: string,
    executorId: string,
    actionType: string,
    targetId?: string
): Promise<{ exceeded: boolean; count: number }> {
    const settings = await database.getAntinukeSettings(guildId);

    if (!settings.enabled) {
        return { exceeded: false, count: 0 };
    }

    // Log the action to database for persistence
    await database.logAntinukeAction(guildId, executorId, actionType, targetId);

    // In-memory rate tracking for fast threshold checking
    const now = Date.now();
    const windowMs = settings.time_window * 1000;

    if (!actionTracker.has(guildId)) {
        actionTracker.set(guildId, new Map());
    }
    const guildTracker = actionTracker.get(guildId)!;

    if (!guildTracker.has(executorId)) {
        guildTracker.set(executorId, []);
    }
    const timestamps = guildTracker.get(executorId)!;

    // Add current timestamp and filter old ones
    timestamps.push(now);
    const recentTimestamps = timestamps.filter((t) => now - t < windowMs);
    guildTracker.set(executorId, recentTimestamps);

    const exceeded = recentTimestamps.length >= settings.threshold;

    return { exceeded, count: recentTimestamps.length };
}

/**
 * Check if a user is whitelisted from anti-nuke detection
 */
export async function isWhitelisted(
    database: DatabasePlugin,
    guildId: string,
    userId: string,
    userRoleIds?: string[]
): Promise<boolean> {
    const settings = await database.getAntinukeSettings(guildId);

    // Check if user is directly whitelisted
    if (settings.whitelisted_users.includes(userId)) {
        return true;
    }

    // Check if user is the trusted user (always exempt)
    if (settings.trusted_user) {
        // Handle both raw user ID and @mention format
        const trustedUserId = settings.trusted_user.replace(/^<@!?/, "").replace(/>$/, "");
        if (trustedUserId === userId) {
            return true;
        }
    }

    // Check if any of user's roles are whitelisted
    if (userRoleIds) {
        for (const roleId of userRoleIds) {
            if (settings.whitelisted_roles.includes(roleId)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Handle a detected threat with escalating response
 * 1st offense: Mute for 30 minutes
 * 2nd offense: Remove all permissions
 * 3rd+ offense: Kick from server
 */
export async function handleThreat(
    client: Client,
    database: DatabasePlugin,
    guild: Guild,
    offenderId: string,
    actionType: string
): Promise<{ action: string; success: boolean; error?: string }> {
    try {
        // Increment offense count
        const offenseCount = await database.incrementOffense(guild.id, offenderId);
        const offender = guild.members.get(offenderId);

        if (!offender) {
            return { action: "none", success: false, error: "Offender not found in guild" };
        }

        // Alert the owner
        await alertOwner(client, guild, offenderId, actionType, offenseCount);

        // Escalating response
        if (offenseCount === 1) {
            // First offense: Mute for 30 minutes
            return await muteOffender(client, guild, offender);
        } else if (offenseCount === 2) {
            // Second offense: Remove permissions
            return await removePermissions(client, guild, offender);
        } else {
            // Third+ offense: Kick
            return await kickOffender(client, guild, offender);
        }
    } catch (error) {
        logger.error(`Anti-nuke handleThreat error: ${(error as Error).stack || error}`);
        return { action: "error", success: false, error: (error as Error).message };
    }
}

/**
 * Handle compromised owner scenario
 * Delete the nuked channel, create Fallback role, assign to trusted user
 */
export async function handleOwnerThreat(
    client: Client,
    database: DatabasePlugin,
    guild: Guild,
    channelId?: string
): Promise<{ success: boolean; trustedUserAlerted: boolean; error?: string }> {
    try {
        const settings = await database.getAntinukeSettings(guild.id);

        // Step 1: Delete the nuked channel if provided
        if (channelId) {
            try {
                await client.rest.channels.delete(channelId, "Anti-nuke: Owner compromise detected");
                logger.info(`Anti-nuke: Deleted compromised channel ${channelId} in guild ${guild.id}`);
            } catch (e) {
                logger.error(`Anti-nuke: Failed to delete channel ${channelId}: ${(e as Error).message}`);
            }
        }

        // Step 2: Check if trusted user is configured
        if (!settings.trusted_user) {
            return { success: true, trustedUserAlerted: false, error: "No trusted user configured" };
        }

        // Resolve trusted user ID (handle @mention or raw ID)
        const trustedUserId = settings.trusted_user.replace(/^<@!?/, "").replace(/>$/, "");
        const trustedMember = guild.members.get(trustedUserId);

        if (!trustedMember) {
            return { success: true, trustedUserAlerted: false, error: "Trusted user not in guild" };
        }

        // Step 3: Create or find Fallback Admin role
        let fallbackRole = guild.roles.find((r) => r.name === FALLBACK_ROLE_NAME);

        if (!fallbackRole) {
            fallbackRole = await client.rest.guilds.createRole(guild.id, {
                name: FALLBACK_ROLE_NAME,
                permissions: "8", // Administrator
                color: 0xe74c3c, // Red color for visibility
                reason: "Anti-nuke: Created fallback admin role for emergency",
            });
            logger.info(`Anti-nuke: Created Fallback Admin role in guild ${guild.id}`);
        }

        // Step 4: Assign role to trusted user
        await client.rest.guilds.addMemberRole(guild.id, trustedUserId, fallbackRole.id, "Anti-nuke: Owner compromise detected");
        logger.info(`Anti-nuke: Assigned Fallback Admin to ${trustedUserId} in guild ${guild.id}`);

        // Step 5: DM trusted user with alert
        try {
            const dmChannel = await trustedMember.user.createDM();
            await dmChannel.createMessage({
                embeds: [
                    {
                        color: 0xe74c3c,
                        title: "🚨 EMERGENCY: Owner Account Compromise Detected",
                        description: `The owner of **${guild.name}** appears to be performing malicious actions.\n\nYou have been granted Administrator permissions via the **${FALLBACK_ROLE_NAME}** role.\n\nPlease take immediate action to secure the server.`,
                        fields: [
                            { name: "Server", value: guild.name, inline: true },
                            { name: "Server ID", value: guild.id, inline: true },
                        ],
                        timestamp: new Date().toISOString(),
                    },
                ],
            });
        } catch (e) {
            logger.error(`Anti-nuke: Failed to DM trusted user: ${(e as Error).message}`);
        }

        return { success: true, trustedUserAlerted: true };
    } catch (error) {
        logger.error(`Anti-nuke handleOwnerThreat error: ${(error as Error).stack || error}`);
        return { success: false, trustedUserAlerted: false, error: (error as Error).message };
    }
}

/**
 * Alert the server owner about a detected threat
 */
async function alertOwner(
    client: Client,
    guild: Guild,
    offenderId: string,
    actionType: string,
    offenseCount: number
): Promise<void> {
    try {
        const owner = await client.rest.users.get(guild.ownerID!);
        const offender = await client.rest.users.get(offenderId).catch(() => null);

        const dmChannel = await owner.createDM();
        await dmChannel.createMessage({
            embeds: [
                {
                    color: 0xf39c12,
                    title: "⚠️ Anti-Nuke Alert",
                    description: `Suspicious activity detected in **${guild.name}**`,
                    fields: [
                        { name: "User", value: offender ? `${offender.tag} (${offenderId})` : offenderId, inline: true },
                        { name: "Action Type", value: actionType, inline: true },
                        { name: "Offense #", value: offenseCount.toString(), inline: true },
                        {
                            name: "Response",
                            value: offenseCount === 1 ? "Muted for 30 minutes" : offenseCount === 2 ? "Permissions removed" : "Kicked from server",
                            inline: false,
                        },
                    ],
                    timestamp: new Date().toISOString(),
                },
            ],
        });
    } catch (e) {
        logger.error(`Anti-nuke: Failed to alert owner: ${(e as Error).message}`);
    }
}

/**
 * Mute the offender for 30 minutes
 */
async function muteOffender(
    client: Client,
    guild: Guild,
    offender: Member
): Promise<{ action: string; success: boolean; error?: string }> {
    try {
        const timeoutUntil = new Date(Date.now() + MUTE_DURATION_MS);
        await client.rest.guilds.editMember(guild.id, offender.id, {
            communicationDisabledUntil: timeoutUntil.toISOString(),
            reason: "Anti-nuke: 1st offense - 30 minute timeout",
        });
        logger.info(`Anti-nuke: Muted ${offender.id} in ${guild.id} for 30 minutes`);
        return { action: "mute", success: true };
    } catch (e) {
        logger.error(`Anti-nuke: Failed to mute offender: ${(e as Error).message}`);
        return { action: "mute", success: false, error: (e as Error).message };
    }
}

/**
 * Remove all dangerous permissions from offender's roles
 */
async function removePermissions(
    client: Client,
    guild: Guild,
    offender: Member
): Promise<{ action: string; success: boolean; error?: string }> {
    try {
        // Remove all roles except @everyone
        const rolesToRemove = offender.roles.filter((roleId) => roleId !== guild.id);

        for (const roleId of rolesToRemove) {
            try {
                await client.rest.guilds.removeMemberRole(guild.id, offender.id, roleId, "Anti-nuke: 2nd offense - removing permissions");
            } catch (e) {
                logger.warn(`Anti-nuke: Could not remove role ${roleId}: ${(e as Error).message}`);
            }
        }

        logger.info(`Anti-nuke: Removed permissions from ${offender.id} in ${guild.id}`);
        return { action: "remove_permissions", success: true };
    } catch (e) {
        logger.error(`Anti-nuke: Failed to remove permissions: ${(e as Error).message}`);
        return { action: "remove_permissions", success: false, error: (e as Error).message };
    }
}

/**
 * Kick the offender from the server
 */
async function kickOffender(
    client: Client,
    guild: Guild,
    offender: Member
): Promise<{ action: string; success: boolean; error?: string }> {
    try {
        await client.rest.guilds.removeMember(guild.id, offender.id, "Anti-nuke: 3rd+ offense - kicked from server");
        logger.info(`Anti-nuke: Kicked ${offender.id} from ${guild.id}`);
        return { action: "kick", success: true };
    } catch (e) {
        logger.error(`Anti-nuke: Failed to kick offender: ${(e as Error).message}`);
        return { action: "kick", success: false, error: (e as Error).message };
    }
}

/**
 * Clear in-memory action tracker (call periodically to prevent memory leaks)
 */
export function clearActionTracker(guildId?: string): void {
    if (guildId) {
        actionTracker.delete(guildId);
        messageTracker.delete(guildId);
    } else {
        actionTracker.clear();
        messageTracker.clear();
    }
}

/**
 * Prune old entries from trackers to prevent memory leaks
 * This runs automatically every 5 minutes
 */
function pruneTrackers(): void {
    const now = Date.now();
    const maxAge = 60 * 1000; // 1 minute - remove entries older than this

    for (const [guildId, guildTracker] of actionTracker) {
        for (const [userId, timestamps] of guildTracker) {
            const recent = timestamps.filter((t) => now - t < maxAge);
            if (recent.length === 0) {
                guildTracker.delete(userId);
            } else {
                guildTracker.set(userId, recent);
            }
        }
        if (guildTracker.size === 0) {
            actionTracker.delete(guildId);
        }
    }

    for (const [guildId, guildTracker] of messageTracker) {
        for (const [userId, timestamps] of guildTracker) {
            const recent = timestamps.filter((t) => now - t < maxAge);
            if (recent.length === 0) {
                guildTracker.delete(userId);
            } else {
                guildTracker.set(userId, recent);
            }
        }
        if (guildTracker.size === 0) {
            messageTracker.delete(guildId);
        }
    }
}

// Auto-prune trackers every 5 minutes to prevent memory leaks
// Use unref() so this doesn't prevent Node.js from exiting
setInterval(pruneTrackers, 5 * 60 * 1000).unref();

/**
 * Check if a user is message spamming (SEPARATE from action threshold)
 * Threshold: 20 messages in 10 seconds
 * Returns the channel ID if spam is detected (for channel deletion on owner threat)
 */
export async function checkMessageSpam(
    database: DatabasePlugin,
    guildId: string,
    userId: string,
    channelId: string
): Promise<{ exceeded: boolean; count: number; channelId: string }> {
    const settings = await database.getAntinukeSettings(guildId);

    if (!settings.enabled) {
        return { exceeded: false, count: 0, channelId };
    }

    const now = Date.now();

    if (!messageTracker.has(guildId)) {
        messageTracker.set(guildId, new Map());
    }
    const guildTracker = messageTracker.get(guildId)!;

    if (!guildTracker.has(userId)) {
        guildTracker.set(userId, []);
    }
    const timestamps = guildTracker.get(userId)!;

    // Add current timestamp and filter old ones
    timestamps.push(now);
    const recentTimestamps = timestamps.filter((t) => now - t < MESSAGE_SPAM_WINDOW_MS);
    guildTracker.set(userId, recentTimestamps);

    const exceeded = recentTimestamps.length >= MESSAGE_SPAM_THRESHOLD;

    if (exceeded) {
        // Log the spam action for records
        await database.logAntinukeAction(guildId, userId, "message_spam", channelId);
    }

    return { exceeded, count: recentTimestamps.length, channelId };
}
