import assert from "node:assert/strict";
import test from "node:test";

// Test the antinuke utility functions
// Note: We're testing the exported functions, not the internal state

test("antinuke module exports required functions", async () => {
    const antinuke = await import("../dist/utils/antinuke.js");

    assert.equal(typeof antinuke.checkAndLogAction, "function");
    assert.equal(typeof antinuke.isWhitelisted, "function");
    assert.equal(typeof antinuke.handleThreat, "function");
    assert.equal(typeof antinuke.handleOwnerThreat, "function");
    assert.equal(typeof antinuke.clearActionTracker, "function");
    assert.equal(typeof antinuke.checkMessageSpam, "function");
});

test("clearActionTracker runs without errors", async () => {
    const { clearActionTracker } = await import("../dist/utils/antinuke.js");

    // Should not throw when called with no arguments
    assert.doesNotThrow(() => clearActionTracker());

    // Should not throw when called with a specific guild ID
    assert.doesNotThrow(() => clearActionTracker("123456789"));
});

// Mock database for testing isWhitelisted
const mockDatabase = {
    getAntinukeSettings: async (guildId) => ({
        guild_id: guildId,
        enabled: true,
        threshold: 5,
        time_window: 60,
        log_channel_id: null,
        trusted_user: "111222333",
        whitelisted_users: ["444555666"],
        whitelisted_roles: ["777888999"],
    }),
};

test("isWhitelisted returns true for whitelisted users", async () => {
    const { isWhitelisted } = await import("../dist/utils/antinuke.js");

    // Directly whitelisted user
    const result = await isWhitelisted(mockDatabase, "test-guild", "444555666", []);
    assert.equal(result, true);
});

test("isWhitelisted returns true for trusted user", async () => {
    const { isWhitelisted } = await import("../dist/utils/antinuke.js");

    // Trusted user
    const result = await isWhitelisted(mockDatabase, "test-guild", "111222333", []);
    assert.equal(result, true);
});

test("isWhitelisted returns true for users with whitelisted role", async () => {
    const { isWhitelisted } = await import("../dist/utils/antinuke.js");

    // User with whitelisted role
    const result = await isWhitelisted(mockDatabase, "test-guild", "random-user", ["777888999"]);
    assert.equal(result, true);
});

test("isWhitelisted returns false for non-whitelisted users", async () => {
    const { isWhitelisted } = await import("../dist/utils/antinuke.js");

    // Random user with no whitelisted roles
    const result = await isWhitelisted(mockDatabase, "test-guild", "random-user", ["some-other-role"]);
    assert.equal(result, false);
});

test("isWhitelisted handles trusted_user with mention format", async () => {
    const { isWhitelisted } = await import("../dist/utils/antinuke.js");

    const mockDbWithMention = {
        getAntinukeSettings: async () => ({
            guild_id: "test",
            enabled: true,
            threshold: 5,
            time_window: 60,
            log_channel_id: null,
            trusted_user: "<@111222333>", // Mention format
            whitelisted_users: [],
            whitelisted_roles: [],
        }),
    };

    const result = await isWhitelisted(mockDbWithMention, "test-guild", "111222333", []);
    assert.equal(result, true);
});

// Test checkAndLogAction with mock database
test("checkAndLogAction returns exceeded false when disabled", async () => {
    const { checkAndLogAction, clearActionTracker } = await import("../dist/utils/antinuke.js");

    const mockDbDisabled = {
        getAntinukeSettings: async () => ({
            guild_id: "test",
            enabled: false, // Disabled
            threshold: 5,
            time_window: 60,
            log_channel_id: null,
            trusted_user: null,
            whitelisted_users: [],
            whitelisted_roles: [],
        }),
        logAntinukeAction: async () => { },
    };

    // Clear any previous state
    clearActionTracker("test-guild");

    const result = await checkAndLogAction(mockDbDisabled, "test-guild", "executor-1", "test_action");
    assert.equal(result.exceeded, false);
    assert.equal(result.count, 0);
});

test("checkAndLogAction tracks actions and detects threshold exceeded", async () => {
    const { checkAndLogAction, clearActionTracker } = await import("../dist/utils/antinuke.js");

    const mockDbEnabled = {
        getAntinukeSettings: async () => ({
            guild_id: "threshold-test-guild",
            enabled: true,
            threshold: 3, // Low threshold for testing
            time_window: 60,
            log_channel_id: null,
            trusted_user: null,
            whitelisted_users: [],
            whitelisted_roles: [],
        }),
        logAntinukeAction: async () => { },
    };

    // Clear any previous state
    clearActionTracker("threshold-test-guild");

    // First action - should not exceed
    let result = await checkAndLogAction(mockDbEnabled, "threshold-test-guild", "executor-2", "test_action");
    assert.equal(result.exceeded, false);
    assert.equal(result.count, 1);

    // Second action
    result = await checkAndLogAction(mockDbEnabled, "threshold-test-guild", "executor-2", "test_action");
    assert.equal(result.exceeded, false);
    assert.equal(result.count, 2);

    // Third action - should exceed threshold
    result = await checkAndLogAction(mockDbEnabled, "threshold-test-guild", "executor-2", "test_action");
    assert.equal(result.exceeded, true);
    assert.equal(result.count, 3);

    // Cleanup
    clearActionTracker("threshold-test-guild");
});
