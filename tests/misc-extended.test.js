import assert from "node:assert/strict";
import test from "node:test";

import { random } from "../dist/utils/misc.js";

test("random returns element from array", () => {
    const arr = ["a", "b", "c", "d", "e"];

    // Run multiple times to ensure it works
    for (let i = 0; i < 20; i++) {
        const result = random(arr);
        assert.equal(arr.includes(result), true, `Expected ${result} to be in array`);
    }
});

test("random returns the only element in single-item array", () => {
    const arr = ["only"];
    assert.equal(random(arr), "only");
});

test("textEncode and textDecode are inverses for basic entities", async () => {
    const { textEncode, textDecode } = await import("../dist/utils/misc.js");

    // textDecode(textEncode(x)) should produce expected transformations
    const original = "&><";
    const encoded = textEncode(original);
    assert.equal(encoded, "&amp;&gt;&lt;");

    const decoded = textDecode(encoded);
    assert.equal(decoded, original);
});

test("clean breaks up backticks to prevent code injection", async () => {
    const { clean } = await import("../dist/utils/misc.js");

    const input = "Some `code` here";
    const cleaned = clean(input, true);

    // Backticks should be followed by zero-width space
    assert.equal(cleaned.includes("`\u200b"), true);
});

test("isEmpty handles various whitespace characters", async () => {
    const { isEmpty } = await import("../dist/utils/misc.js");

    // Various empty strings
    assert.equal(isEmpty(""), true);
    assert.equal(isEmpty("   "), true);
    assert.equal(isEmpty("\t\n\r"), true);
    assert.equal(isEmpty("\u2800\u2800"), true); // Braille blanks

    // Non-empty strings
    assert.equal(isEmpty("hello"), false);
    assert.equal(isEmpty("  hello  "), false);
    assert.equal(isEmpty("0"), false);
});

test("safeBigInt handles edge cases", async () => {
    const { safeBigInt } = await import("../dist/utils/misc.js");

    // Valid conversions
    assert.equal(safeBigInt(0), 0n);
    assert.equal(safeBigInt("0"), 0n);
    assert.equal(safeBigInt(false), 0n);
    assert.equal(safeBigInt(-123), -123n);
    assert.equal(safeBigInt("-456"), -456n);

    // Very large numbers (Discord snowflakes)
    assert.equal(safeBigInt("1234567890123456789"), 1234567890123456789n);

    // Invalid conversions return null
    assert.equal(safeBigInt(""), null);
    assert.equal(safeBigInt("1.5"), null); // Floats don't work
    assert.equal(safeBigInt("abc"), null);
    assert.equal(safeBigInt("12abc34"), null);
});

test("safeBigInt handles very large Discord snowflake IDs", async () => {
    const { safeBigInt } = await import("../dist/utils/misc.js");

    // Real Discord snowflake examples
    const snowflake1 = "123456789012345678";
    const snowflake2 = "987654321098765432";

    assert.equal(safeBigInt(snowflake1), 123456789012345678n);
    assert.equal(safeBigInt(snowflake2), 987654321098765432n);

    // Minimum valid Discord snowflake (approximately)
    assert.equal(safeBigInt("21154535154122752"), 21154535154122752n);
});

test("snowflake command validates cleaned mention IDs", async () => {
    const SnowflakeCommand = (await import("../commands/general/utility/snowflake.js")).default;
    const command = Object.assign(Object.create(SnowflakeCommand.prototype), {
        args: ["<@1>"],
        getString: (key) => key,
        success: true,
    });

    assert.equal(await command.run(), "commands.responses.snowflake.invalid");
    assert.equal(command.success, false);
});

test("snowflake command uses bigint math for timestamps", async () => {
    const SnowflakeCommand = (await import("../commands/general/utility/snowflake.js")).default;
    const command = Object.assign(Object.create(SnowflakeCommand.prototype), {
        args: ["<@21154535154122752>"],
        getString: (key) => key,
        success: false,
    });

    assert.equal(await command.run(), "<t:1425114034:F>");
    assert.equal(command.success, true);
});

test("temp image filenames preserve the final extension", async () => {
    const { makeTempImageFilename } = await import("../dist/utils/tempimages.js");

    assert.equal(makeTempImageFilename("gabe.final.png", "abc123"), "abc123.png");
    assert.equal(makeTempImageFilename("README", "abc123"), "abc123.bin");
});

test("classic boolean options preserve false string values", async () => {
    const Command = (await import("../dist/classes/command.js")).default;
    const command = Object.assign(Object.create(Command.prototype), {
        type: "classic",
        args: [],
        options: {
            enabled: "false",
            disabled: false,
            visible: "true",
            zero: "0",
            one: "1",
            junk: "maybe",
        },
    });

    assert.equal(command.getOptionBoolean("enabled"), false);
    assert.equal(command.getOptionBoolean("disabled"), false);
    assert.equal(command.getOptionBoolean("visible"), true);
    assert.equal(command.getOptionBoolean("zero"), false);
    assert.equal(command.getOptionBoolean("one"), true);
    assert.equal(command.getOptionBoolean("junk"), undefined);
});

test("parseCommand keeps em dash boolean flag names intact", async () => {
    const parseCommand = (await import("../dist/utils/parseCommand.js")).default;
    const parsed = parseCommand(`cmd \u2014flag`);

    assert.deepEqual(parsed, {
        args: ["cmd"],
        flags: {
            flag: true,
        },
    });
});

test("classic numeric options return undefined when missing or invalid", async () => {
    const Command = (await import("../dist/classes/command.js")).default;
    const command = Object.assign(Object.create(Command.prototype), {
        type: "classic",
        args: [],
        options: {
            goodInt: "42",
            goodNum: "4.5",
            bad: "nope",
        partialInt: "42px",
        partialNum: "4.5px",
        infinity: "Infinity",
        hex: "0x10",
        exponent: "1e2",
    },
});

    assert.equal(command.getOptionInteger("goodInt"), 42);
    assert.equal(command.getOptionNumber("goodNum"), 4.5);
    assert.equal(command.getOptionInteger("missing"), undefined);
    assert.equal(command.getOptionNumber("missing"), undefined);
    assert.equal(command.getOptionInteger("bad"), undefined);
    assert.equal(command.getOptionNumber("bad"), undefined);
    assert.equal(command.getOptionInteger("partialInt"), undefined);
    assert.equal(command.getOptionNumber("partialNum"), undefined);
    assert.equal(command.getOptionNumber("infinity"), undefined);
    assert.equal(command.getOptionInteger("hex"), undefined);
    assert.equal(command.getOptionNumber("exponent"), undefined);
});

test("classic entity options clean discord mention syntax", async () => {
    const Command = (await import("../dist/classes/command.js")).default;
    const user = { id: "123" };
    const member = { id: "123" };
    const role = { id: "456" };
    const channel = { id: "789" };
    const command = Object.assign(Object.create(Command.prototype), {
        type: "classic",
        args: [],
        options: {
            user: "<@!123>",
            member: "<@123>",
            role: "<@&456>",
            channel: "<#789>",
        },
        client: {
            users: new Map([["123", user]]),
        },
        guild: {
            members: new Map([["123", member]]),
            roles: new Map([["456", role]]),
            channels: new Map([["789", channel]]),
        },
    });

    assert.equal(command.getOptionUser("user"), user);
    assert.equal(command.getOptionMember("member"), member);
    assert.equal(command.getOptionRole("role"), role);
    assert.equal(command.getOptionChannel("channel"), channel);
});

test("classic default string option returns undefined for empty args", async () => {
    const Command = (await import("../dist/classes/command.js")).default;
    const command = Object.assign(Object.create(Command.prototype), {
        type: "classic",
        args: [],
        options: {},
    });

    assert.equal(command.getOptionString("query", true), undefined);
});

test("fetchWithTimeout preserves caller abort signals", async () => {
    const { fetchWithTimeout } = await import("../dist/utils/apifetch.js");
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();

    globalThis.fetch = async (_url, init) => {
        const signal = init.signal;
        if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });

        return new Promise((_resolve, reject) => {
            signal.addEventListener(
                "abort",
                () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
                { once: true },
            );
        });
    };

    try {
        const request = fetchWithTimeout("https://example.invalid", { signal: controller.signal }, 10000);
        controller.abort();
        await assert.rejects(request, { name: "AbortError" });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("music seek parser rejects malformed clock positions", async () => {
    const { parseSeekPosition } = await import("../commands/music/music/seek.js");

    assert.equal(parseSeekPosition("1:02"), 62);
    assert.equal(parseSeekPosition("1:02:03"), 3723);
    assert.equal(Number.isNaN(parseSeekPosition("1:")), true);
    assert.equal(Number.isNaN(parseSeekPosition("1:99")), true);
    assert.equal(Number.isNaN(parseSeekPosition("12abc")), true);
});

test("birthday setup message reads slash value option", async () => {
    const BirthdaySetupCommand = (await import("../commands/general/birthday/setup.js")).default;
    const settings = { guild_id: "guild", enabled: false };
    const command = Object.assign(Object.create(BirthdaySetupCommand.prototype), {
        guild: { id: "guild" },
        member: {
            permissions: {
                has: () => true,
            },
        },
        author: { id: "user" },
        args: [],
        type: "classic",
        options: {
            action: "message",
            value: "happy {user}",
        },
        database: {
            getBirthdaySettings: async () => settings,
            setBirthdaySettings: async (next) => Object.assign(settings, next),
        },
        success: false,
    });

    assert.equal(await command.run(), "✅ Birthday message updated.");
    assert.equal(settings.message, "happy {user}");
    assert.equal(command.success, true);
});

test("battle duration validation rejects values outside command limits", async () => {
    const { isValidBattleDuration } = await import("../commands/fun/battle/start.js");

    assert.equal(isValidBattleDuration(5), true);
    assert.equal(isValidBattleDuration(120), true);
    assert.equal(isValidBattleDuration(4), false);
    assert.equal(isValidBattleDuration(121), false);
    assert.equal(isValidBattleDuration(5.5), false);
});

test("battle leaderboard validates limit before reading stats", async () => {
    const BattleLeaderboardCommand = (await import("../commands/fun/battle/leaderboard.js")).default;
    let readLeaderboard = false;
    const command = Object.assign(Object.create(BattleLeaderboardCommand.prototype), {
        guild: { id: "guild" },
        getOptionInteger: () => 0,
        database: {
            getBattleLeaderboard: async () => {
                readLeaderboard = true;
                return [];
            },
        },
        success: true,
    });

    assert.match(await command.run(), /between 1 and 25/);
    assert.equal(readLeaderboard, false);
    assert.equal(command.success, false);
    assert.equal(BattleLeaderboardCommand.flags[0].minValue, 1);
    assert.equal(BattleLeaderboardCommand.flags[0].maxValue, 25);
});

test("battle vote parser rejects fractional and partial numbers", async () => {
    const { parseSubmissionNumber } = await import("../commands/fun/battle/vote.js");

    assert.equal(parseSubmissionNumber("2"), 2);
    assert.equal(parseSubmissionNumber(3), 3);
    assert.equal(parseSubmissionNumber("1.5"), undefined);
    assert.equal(parseSubmissionNumber("2abc"), undefined);
    assert.equal(parseSubmissionNumber("0"), undefined);
});

test("battle vote transitions expired submissions before voting", async () => {
    const BattleVoteCommand = (await import("../commands/fun/battle/vote.js")).default;
    const battle = {
        id: 1,
        guild_id: "guild",
        host_id: "host",
        theme: "theme",
        status: "submissions",
        submission_end: new Date(Date.now() - 60_000).toISOString(),
        voting_end: null,
        created_at: new Date().toISOString(),
    };
    const submissions = [
        { id: 10, user_id: "artist-a", image_url: "https://example.com/a.png" },
        { id: 11, user_id: "artist-b", image_url: "https://example.com/b.png" },
    ];
    const votes = [];
    const announcements = [];
    const command = Object.assign(Object.create(BattleVoteCommand.prototype), {
        client: {},
        guild: { id: "guild" },
        author: { id: "voter" },
        channel: {
            createMessage: async (message) => announcements.push(message),
        },
        args: ["1"],
        database: {
            getActiveBattle: async () => battle,
            getSubmissions: async () => submissions,
            updateBattleStatus: async (_battleId, status, votingEnd) => {
                battle.status = status;
                battle.voting_end = votingEnd ?? null;
            },
            hasVoted: async () => false,
            addVote: async (battleId, userId, submissionId) => {
                votes.push({ battleId, userId, submissionId });
            },
        },
        getOptionInteger: () => undefined,
        getString: (key) => key,
        success: false,
    });

    const result = await command.run();

    assert.equal(battle.status, "voting");
    assert.equal(votes.length, 1);
    assert.deepEqual(votes[0], { battleId: 1, userId: "voter", submissionId: 10 });
    assert.match(result.content, /voted for submission #1/);
    assert.match(announcements[0], /Voting has begun/);
    assert.equal(command.success, true);
});

test("battle status refreshes expired submission phases", async () => {
    const BattleStatusCommand = (await import("../commands/fun/battle/status.js")).default;
    const battle = {
        id: 2,
        guild_id: "guild",
        host_id: "host",
        theme: "theme",
        status: "submissions",
        submission_end: new Date(Date.now() - 60_000).toISOString(),
        voting_end: null,
        created_at: new Date().toISOString(),
    };
    const submissions = [
        { id: 20, user_id: "artist-a", image_url: "https://example.com/a.png" },
        { id: 21, user_id: "artist-b", image_url: "https://example.com/b.png" },
    ];
    const command = Object.assign(Object.create(BattleStatusCommand.prototype), {
        client: {},
        guild: { id: "guild" },
        channel: {
            createMessage: async () => undefined,
        },
        database: {
            getActiveBattle: async () => battle,
            getSubmissions: async () => submissions,
            updateBattleStatus: async (_battleId, status, votingEnd) => {
                battle.status = status;
                battle.voting_end = votingEnd ?? null;
            },
        },
        getString: (key) => key,
        success: false,
    });

    const result = await command.run();

    assert.equal(battle.status, "voting");
    assert.match(result.embeds[0].description, /Voting in Progress/);
    assert.match(result.embeds[0].description, /#1/);
    assert.equal(command.success, true);
});

test("classic integer arg parsing skips mentions and rejects partial numbers", async () => {
    const {
        cleanDiscordId,
        parseBooleanArg,
        parseDiscordSnowflakeArg,
        parseFirstIntegerArg,
        parseIntegerArg,
        parseNumberArg,
    } =
        await import("../dist/utils/commandArgs.js");

    assert.equal(cleanDiscordId("<@!123>"), "123");
    assert.equal(cleanDiscordId("<#456>"), "456");
    assert.equal(parseDiscordSnowflakeArg("<@!21154535154122752>"), "21154535154122752");
    assert.equal(parseDiscordSnowflakeArg("<#21154535154122752>"), "21154535154122752");
    assert.equal(parseDiscordSnowflakeArg("<@1>"), undefined);
    assert.equal(parseDiscordSnowflakeArg("not-id"), undefined);
    assert.equal(parseBooleanArg("enabled"), true);
    assert.equal(parseBooleanArg("off"), false);
    assert.equal(parseBooleanArg("maybe"), undefined);
    assert.equal(parseFirstIntegerArg(["<@123>", "50"]), 50);
    assert.equal(parseFirstIntegerArg(["-25", "<@123>"]), -25);
    assert.equal(parseFirstIntegerArg(["<@123>", "50coins"]), undefined);
    assert.equal(parseFirstIntegerArg(["<@123>", "1.5"]), undefined);
    assert.equal(parseIntegerArg("10coins"), undefined);
    assert.equal(parseIntegerArg("9007199254740993"), undefined);
    assert.equal(parseNumberArg("1.5"), 1.5);
    assert.equal(parseNumberArg(".5"), 0.5);
    assert.equal(parseNumberArg("1.5coins"), undefined);
    assert.equal(parseNumberArg("Infinity"), undefined);
});

test("classic moderation user mentions are cleaned before rest lookups", async () => {
    const WarnCommand = (await import("../commands/moderation/mod/warn.js")).default;
    const lookups = [];
    const modLogs = [];
    const warnings = [];
    const target = { id: "123", tag: "target#0001" };
    const command = Object.assign(Object.create(WarnCommand.prototype), {
        guild: {
            id: "guild",
            members: new Map(),
        },
        member: {
            permissions: {
                has: () => true,
            },
        },
        author: { id: "mod", tag: "mod#0001" },
        client: {
            user: { id: "bot" },
            rest: {
                users: {
                    get: async (id) => {
                        lookups.push(id);
                        return id === "123" ? target : null;
                    },
                },
            },
        },
        args: ["<@!123>", "being", "loud"],
        getOptionUser: () => undefined,
        getOptionString: () => undefined,
        database: {
            addWarning: async (guildId, userId, moderatorId, reason) => {
                warnings.push({ guildId, userId, moderatorId, reason });
                return 7;
            },
            addModLog: async (guildId, userId, moderatorId, action, reason) => {
                modLogs.push({ guildId, userId, moderatorId, action, reason });
            },
            getWarnings: async () => [{ id: 7 }],
            getUserPreferences: async () => ({}),
        },
        success: false,
    });

    const result = await command.run();

    assert.deepEqual(lookups, ["123"]);
    assert.deepEqual(warnings[0], {
        guildId: "guild",
        userId: "123",
        moderatorId: "mod",
        reason: "being loud",
    });
    assert.deepEqual(modLogs[0], {
        guildId: "guild",
        userId: "123",
        moderatorId: "mod",
        action: "warn",
        reason: "being loud",
    });
    assert.match(result, /WARNING #1/);
    assert.equal(command.success, true);
});

test("classic dice rejects non-positive max values", async () => {
    const DiceCommand = (await import("../commands/fun/random/dice.js")).default;
    const command = Object.assign(Object.create(DiceCommand.prototype), {
        getOptionInteger: () => -5,
        getString: (key, options) => options?.returnNull ? undefined : key,
        success: true,
    });

    assert.match(await command.run(), /at least 1/);
    assert.equal(command.success, false);
});

test("classic economy commands reject partial numeric inputs", async () => {
    const RouletteCommand = (await import("../commands/economy/gamble/roulette.js")).default;
    const BuyCommand = (await import("../commands/economy/crypto/buy.js")).default;
    const roulette = Object.assign(Object.create(RouletteCommand.prototype), {
        guild: { id: "guild" },
        author: { id: "user" },
        options: {},
        args: ["10", "12abc"],
        database: {
            isEconomyEnabled: async () => true,
            getEconomyUser: async () => ({ balance: 1000 }),
        },
        success: true,
    });
    const buy = Object.assign(Object.create(BuyCommand.prototype), {
        guild: { id: "guild" },
        author: { id: "user" },
        options: {},
        args: ["GABE", "1.5coins"],
        database: {
            isEconomyEnabled: async () => true,
            getCryptoPrice: async () => {
                throw new Error("invalid amount should stop before price lookup");
            },
        },
        success: true,
    });

    assert.match(await roulette.run(), /Valid bets/);
    assert.equal(roulette.success, false);
    assert.match(await buy.run(), /valid amount/);
    assert.equal(buy.success, false);
});

test("classic music numeric inputs reject partial values", async () => {
    const MusicVolumeCommand = (await import("../commands/music/music/volume.js")).default;
    let volumeSet = false;
    const command = Object.assign(Object.create(MusicVolumeCommand.prototype), {
        guild: {
            id: "guild",
            voiceStates: new Map([["bot", { channelID: "voice" }]]),
        },
        client: { user: { id: "bot" } },
        member: { voiceState: {} },
        memberPermissions: { has: () => true },
        connection: {
            host: "user",
            player: {
                setGlobalVolume: async () => {
                    volumeSet = true;
                },
            },
        },
        author: { id: "user" },
        args: ["50loud"],
        getOptionInteger: () => undefined,
        getString: (key) => key,
        success: true,
    });

    assert.match(await command.run(), /between 0 and 100/);
    assert.equal(volumeSet, false);
    assert.equal(command.success, false);
});

test("classic birthday and ticket setup reject partial numeric inputs", async () => {
    const SetBirthdayCommand = (await import("../commands/general/birthday/set.js")).default;
    const SetupTicketCommand = (await import("../commands/general/ticket/setup.js")).default;
    let birthdaySaved = false;
    let ticketSaved = false;
    const birthday = Object.assign(Object.create(SetBirthdayCommand.prototype), {
        guild: { id: "guild" },
        author: { id: "user" },
        args: ["12abc", "25"],
        database: {
            setBirthday: async () => {
                birthdaySaved = true;
            },
        },
        getOptionInteger: () => undefined,
        success: true,
    });
    const ticket = Object.assign(Object.create(SetupTicketCommand.prototype), {
        guild: { id: "guild" },
        member: {
            permissions: {
                has: () => true,
            },
        },
        author: { id: "user" },
        args: ["maxopen", "3tickets"],
        database: {
            getTicketSettings: async () => ({ guild_id: "guild", max_open_per_user: 1 }),
            setTicketSettings: async () => {
                ticketSaved = true;
            },
        },
        getOptionString: () => undefined,
        success: true,
    });

    assert.match(await birthday.run(), /valid month and day/);
    assert.equal(birthdaySaved, false);
    assert.equal(birthday.success, false);
    assert.match(await ticket.run(), /between 1 and 10/);
    assert.equal(ticketSaved, false);
    assert.equal(ticket.success, false);
});

test("classic market admin commands reject partial numeric inputs", async () => {
    const InflateCommand = (await import("../commands/economy/market/inflate.js")).default;
    const PumpCommand = (await import("../commands/economy/market/pump.js")).default;
    let inflated = false;
    let priceRead = false;
    const baseCommand = {
        guild: { id: "guild" },
        member: {
            permissions: {
                has: () => true,
            },
        },
        author: { id: "user" },
        options: {},
        success: true,
    };
    const inflate = Object.assign(Object.create(InflateCommand.prototype), {
        ...baseCommand,
        args: ["50percent"],
        database: {
            inflateAllBalances: async () => {
                inflated = true;
            },
        },
    });
    const pump = Object.assign(Object.create(PumpCommand.prototype), {
        ...baseCommand,
        args: ["GABE", "50percent"],
        database: {
            getCryptoPrice: async () => {
                priceRead = true;
            },
        },
    });

    assert.match(await inflate.run(), /provide a percentage/);
    assert.equal(inflated, false);
    assert.equal(inflate.success, false);
    assert.match(await pump.run(), /valid pump percentage/);
    assert.equal(priceRead, false);
    assert.equal(pump.success, false);
});

test("classic image numeric params reject partial values without producing nan", async () => {
    const JPEGCommand = (await import("../commands/image-editing/effects/jpeg.js")).default;
    const HueCommand = (await import("../commands/image-editing/effects/hue.js")).default;
    const SpeedCommand = (await import("../commands/image-editing/edit/speed.js")).default;

    const jpeg = Object.assign(Object.create(JPEGCommand.prototype), {
        args: ["80quality"],
        getOptionInteger: () => undefined,
    });
    const hue = Object.assign(Object.create(HueCommand.prototype), {
        args: ["90deg"],
        getOptionInteger: () => undefined,
    });
    const speed = Object.assign(Object.create(SpeedCommand.prototype), {
        args: ["4x"],
        getOptionInteger: () => undefined,
    });

    assert.deepEqual(jpeg.paramsFunc(), { quality: 1 });
    assert.deepEqual(hue.paramsFunc(), { color: "hueshift", shift: 0 });
    assert.deepEqual(speed.paramsFunc(), { speed: 2 });
});

test("classic image commands reject invalid required numeric params before jobs", async () => {
    const { Constants } = await import("oceanic.js");
    const ImageCommand = (await import("../dist/classes/imageCommand.js")).default;

    class RequiredNumberImageCommand extends ImageCommand {
        static requiresImage = false;
        static requiresParam = true;
        static requiredParam = "amount";
        static requiredParamType = Constants.ApplicationCommandOptionTypes.NUMBER;
        static noParam = "no number";
        static command = "noop";
    }

    const command = Object.assign(Object.create(RequiredNumberImageCommand.prototype), {
        type: "classic",
        args: ["10seconds"],
        options: {},
        permissions: {
            has: () => true,
        },
        author: { id: "user" },
        getString: () => undefined,
        success: true,
    });

    assert.equal(await command.run(), "no number");
    assert.equal(command.success, false);
});

test("classic moderation commands reject partial numeric inputs", async () => {
    const WarningsCommand = (await import("../commands/moderation/mod/warnings.js")).default;
    const TimeoutCommand = (await import("../commands/moderation/mod/timeout.js")).default;
    let removedWarning = false;
    const permissions = {
        has: () => true,
    };
    const warnings = Object.assign(Object.create(WarningsCommand.prototype), {
        guild: { id: "guild" },
        member: { permissions },
        permissions,
        author: { id: "mod" },
        args: ["delete", "12abc"],
        database: {
            removeWarning: async () => {
                removedWarning = true;
            },
        },
        getOptionInteger: () => undefined,
        success: true,
    });
    const timeout = Object.assign(Object.create(TimeoutCommand.prototype), {
        guild: { id: "guild" },
        member: { permissions },
        author: { id: "mod" },
        options: {},
        args: ["target", "5min"],
        getOptionUser: () => undefined,
        getOptionInteger: () => undefined,
        success: true,
    });

    assert.match(await warnings.run(), /valid warning ID/);
    assert.equal(removedWarning, false);
    assert.equal(warnings.success, false);
    assert.match(await timeout.run(), /Duration must be/);
    assert.equal(timeout.success, false);
});

test("postgres setPrefix upserts fresh guild rows", async () => {
    const PostgreSQLPlugin = (await import("../dist/database/postgresql.js")).default;
    const calls = [];
    const plugin = Object.create(PostgreSQLPlugin.prototype);
    plugin.sql = (strings, ...values) => {
        calls.push({ text: String.raw({ raw: strings }, ...values.map(() => "?")), values });
        return Promise.resolve([]);
    };

    await plugin.setPrefix("!", { id: "guild" });

    assert.equal(calls.length, 1);
    assert.match(calls[0].text, /INSERT INTO guilds/);
    assert.match(calls[0].text, /ON CONFLICT \(guild_id\) DO UPDATE SET prefix/);
    assert.deepEqual(calls[0].values.slice(0, 2), ["guild", "!"]);
});

test("sqlite setPrefix upserts fresh guild rows", async () => {
    const SQLitePlugin = (await import("../dist/database/sqlite.js")).default;
    const runs = [];
    const plugin = Object.assign(Object.create(SQLitePlugin.prototype), {
        connection: {
            prepare: (query) => ({
                run: (...values) => runs.push({ query, values }),
            }),
        },
    });

    await plugin.setPrefix("!", { id: "guild" });

    assert.equal(runs.length, 1);
    assert.match(runs[0].query, /INSERT INTO guilds/);
    assert.match(runs[0].query, /ON CONFLICT\(guild_id\) DO UPDATE SET prefix = excluded\.prefix/);
    assert.deepEqual(runs[0].values, ["guild", "!", "[]", "[]", "[]"]);
});

test("sqlite getGuild tolerates malformed list columns", async () => {
    const SQLitePlugin = (await import("../dist/database/sqlite.js")).default;
    const plugin = Object.assign(Object.create(SQLitePlugin.prototype), {
        connection: {
            transaction: (fn) => fn,
            prepare: () => ({
                get: () => ({
                    guild_id: "guild",
                    prefix: "!",
                    disabled: "not json",
                    disabled_commands: "{\"bad\":true}",
                    tag_roles: "[\"role\"]",
                }),
            }),
        },
    });

    const guild = await plugin.getGuild("guild");

    assert.deepEqual(guild.disabled, []);
    assert.deepEqual(guild.disabled_commands, []);
    assert.deepEqual(guild.tag_roles, ["role"]);
});

test("level notification command rejects invalid classic booleans", async () => {
    const NotificationsCommand = (await import("../commands/general/levels/notifications.js")).default;
    let saved = false;
    const command = Object.assign(Object.create(NotificationsCommand.prototype), {
        guild: { id: "guild" },
        member: {
            permissions: {
                has: () => true,
            },
        },
        args: ["maybe"],
        options: {},
        getOptionBoolean: () => undefined,
        database: {
            setLevelUpNotifications: async () => {
                saved = true;
            },
        },
        success: true,
    });

    assert.match(await command.run(), /true` or `false/);
    assert.equal(saved, false);
    assert.equal(command.success, false);
});

test("prefix command validates direct classic prefix changes", async () => {
    const PrefixCommand = (await import("../commands/general/serverinfo/prefix.js")).default;
    let saved = false;
    const command = Object.assign(Object.create(PrefixCommand.prototype), {
        guild: { id: "guild" },
        args: ["this-prefix-is-way-too-long"],
        memberPermissions: {
            has: () => true,
        },
        database: {
            getGuild: async () => ({ prefix: "!" }),
            setPrefix: async () => {
                saved = true;
            },
        },
        getString: (key) => key,
        success: true,
    });

    assert.match(await command.run(), /15 characters or less/);
    assert.equal(saved, false);
    assert.equal(command.success, false);
});

test("classic level commands parse amount after a mention", async () => {
    const AddXPCommand = (await import("../commands/general/levels/add_xp.js")).default;
    const command = Object.assign(Object.create(AddXPCommand.prototype), {
        guild: { id: "guild" },
        database: {
            addXP: async (_guildId, userId, amount) => ({ xp: amount, level: 1, leveledUp: false, userId }),
        },
        member: {
            permissions: {
                has: () => true,
            },
        },
        message: {
            mentions: [{ id: "target" }],
        },
        args: ["<@target>", "50"],
        getOptionUser: () => undefined,
        getOptionInteger: () => undefined,
        success: false,
    });

    const result = await command.run();
    assert.match(result, /50 XP/);
    assert.match(result, /<@target>/);
});

test("set level accepts zero as a valid level", async () => {
    const SetLevelCommand = (await import("../commands/general/levels/set_level.js")).default;
    const command = Object.assign(Object.create(SetLevelCommand.prototype), {
        guild: { id: "guild" },
        database: {
            getUserLevel: async () => ({ xp: 100 }),
            addXP: async (_guildId, userId, amount) => ({ xp: 0, level: 0, amount, userId }),
        },
        member: {
            permissions: {
                has: () => true,
            },
        },
        message: {
            mentions: [{ id: "target" }],
        },
        args: ["<@target>", "0"],
        getOptionUser: () => undefined,
        getOptionInteger: () => undefined,
        success: false,
    });

    const result = await command.run();
    assert.match(result, /level 0/);
    assert.match(result, /<@target>/);
});

test("classic admin command accepts mixed-case actions and command names", async () => {
    const CommandCommand = (await import("../commands/general/admin/command.js")).default;
    const collections = await import("../dist/utils/collections.js");
    const previous = collections.commands.get("ping");
    let disabled;
    collections.commands.set("ping", {});

    const command = Object.assign(Object.create(CommandCommand.prototype), {
        guild: { id: "guild" },
        author: { id: "admin" },
        memberPermissions: {
            has: () => true,
        },
        args: ["Disable", "Ping"],
        database: {
            getGuild: async () => ({ prefix: "!", disabled_commands: [] }),
            disableCommand: async (_guildId, commandName) => {
                disabled = commandName;
            },
        },
        getString: (key, data) => `${key}:${data?.params?.command ?? ""}`,
        success: false,
    });

    try {
        const result = await command.run();
        assert.match(result, /commands\.responses\.command\.disabled/);
        assert.equal(disabled, "ping");
        assert.equal(command.success, true);
    } finally {
        if (previous === undefined) collections.commands.delete("ping");
        else collections.commands.set("ping", previous);
    }
});

test("classic channel command accepts mixed-case actions", async () => {
    const ChannelCommand = (await import("../commands/general/utility/channel.js")).default;
    let readGuild = false;
    const command = Object.assign(Object.create(ChannelCommand.prototype), {
        guild: { id: "guild" },
        channel: { id: "channel" },
        author: { id: "admin" },
        memberPermissions: {
            has: () => true,
        },
        args: ["Enable"],
        database: {
            getGuild: async () => {
                readGuild = true;
                return { disabled: [] };
            },
        },
        getString: (key) => key,
        success: true,
    });

    assert.equal(await command.run(), "commands.responses.channel.notDisabled");
    assert.equal(readGuild, true);
});

test("feed commands reject zero limits instead of defaulting", async () => {
    const TwitterLatestCommand = (await import("../commands/internet/twitter/latest.js")).default;
    const RedditTopCommand = (await import("../commands/internet/reddit/top.js")).default;
    const RedditNewCommand = (await import("../commands/internet/reddit/new.js")).default;
    const makeCommand = (CommandClass) =>
        Object.assign(Object.create(CommandClass.prototype), {
            getOptionString: (key) => (key === "username" || key === "subreddit" ? "gabe" : undefined),
            getOptionInteger: () => 0,
            success: true,
        });

    assert.match(await makeCommand(TwitterLatestCommand).run(), /Count must be between 1 and 10/);
    assert.match(await makeCommand(RedditTopCommand).run(), /Limit must be between 1 and 25/);
    assert.match(await makeCommand(RedditNewCommand).run(), /Limit must be between 1 and 25/);
});

test("reddit nsfw filter handles plain post data", async () => {
    const { filterNSFW } = await import("../commands/internet/reddit/post.js");
    const utils = await import("../src/utils/reddit.js");
    const safe = { title: "safe", over_18: false };
    const blocked = { title: "blocked", over_18: true };

    assert.deepEqual(filterNSFW([safe, blocked]), [safe]);
    assert.deepEqual(utils.filterNSFW([safe, blocked]), [safe]);
});

test("classic option numeric strings are strictly parsed in moderation and market settings", async () => {
    const BanCommand = (await import("../commands/moderation/mod/ban.js")).default;
    const AntinukeSettingsCommand = (await import("../commands/moderation/mod/antinuke/settings.js")).default;
    const MarketSettingsCommand = (await import("../commands/economy/market/settings.js")).default;
    const permissions = {
        has: () => true,
    };
    let banned = false;
    let antinukeSaved = false;
    let marketSaved = false;

    const ban = Object.assign(Object.create(BanCommand.prototype), {
        guild: {
            id: "guild",
            members: new Map(),
            createBan: async () => {
                banned = true;
            },
        },
        member: { permissions },
        author: { id: "mod", tag: "mod#0001" },
        client: { user: { id: "bot" }, rest: { users: { get: async () => ({ id: "target", tag: "target#0001" }) } } },
        type: "classic",
        options: { user: "target", days: "5abc" },
        args: [],
        success: true,
    });
    const antinuke = Object.assign(Object.create(AntinukeSettingsCommand.prototype), {
        guild: { id: "guild" },
        member: { permissions },
        options: { threshold: "10abc" },
        getOptionInteger: () => undefined,
        getOptionChannel: () => undefined,
        database: {
            getAntinukeSettings: async () => ({ threshold: 5, time_window: 10 }),
            setAntinukeSettings: async () => {
                antinukeSaved = true;
            },
        },
        success: true,
    });
    const market = Object.assign(Object.create(MarketSettingsCommand.prototype), {
        guild: { id: "guild" },
        member: { permissions },
        author: { id: "admin" },
        options: { action: "Daily", value: "100abc" },
        args: [],
        database: {
            getEconomySettings: async () => ({ enabled: true }),
            setEconomySettings: async () => {
                marketSaved = true;
            },
        },
        success: true,
    });

    assert.match(await ban.run(), /delete days must be between 0 and 7/);
    assert.equal(banned, false);
    assert.match(await antinuke.run(), /Threshold must be between 1 and 100/);
    assert.equal(antinukeSaved, false);
    assert.match(await market.run(), /valid daily amount/);
    assert.equal(marketSaved, false);
});

test("classic optional numeric image flags reject malformed values before jobs", async () => {
    const { Constants } = await import("oceanic.js");
    const ImageCommand = (await import("../dist/classes/imageCommand.js")).default;

    let paramsCalled = false;
    class OptionalNumberImageCommand extends ImageCommand {
        paramsFunc() {
            paramsCalled = true;
            return {};
        }

        static flags = [
            {
                name: "scale",
                type: Constants.ApplicationCommandOptionTypes.NUMBER,
                description: "Scale",
            },
        ];
        static requiresImage = false;
        static command = "noop";
    }

    const command = Object.assign(Object.create(OptionalNumberImageCommand.prototype), {
        type: "classic",
        args: [],
        options: { scale: "2x" },
        permissions: {
            has: () => true,
        },
        author: { id: "user" },
        success: true,
    });

    assert.equal(await command.run(), "Invalid number for `scale`.");
    assert.equal(paramsCalled, false);
    assert.equal(command.success, false);
});

test("nickname command rejects nicknames over discord limit before edit", async () => {
    const NicknameCommand = (await import("../commands/moderation/mod/nickname.js")).default;
    let edited = false;
    const permissions = {
        has: () => true,
    };
    const command = Object.assign(Object.create(NicknameCommand.prototype), {
        guild: { id: "guild" },
        member: { permissions },
        client: { user: { id: "bot" } },
        options: {
            user: "target",
            nickname: "x".repeat(33),
        },
        args: [],
        success: true,
    });

    assert.match(await command.run(), /32 characters or less/);
    assert.equal(edited, false);
});

test("mention helpers return undefined when rest lookups miss", async () => {
    const { getUser, mentionToObject } = await import("../dist/utils/mentions.js");
    const client = {
        users: new Map(),
        getChannel: () => undefined,
        rest: {
            users: {
                get: async () => {
                    throw new Error("missing user");
                },
            },
            channels: {
                get: async () => {
                    throw new Error("missing channel");
                },
            },
            guilds: {
                getMember: async () => {
                    throw new Error("missing member");
                },
                getRole: async () => {
                    throw new Error("missing role");
                },
            },
        },
    };
    const guild = {
        id: "guild",
        members: new Map(),
        roles: new Map(),
    };

    assert.equal(await getUser(client, guild, "21154535154122753"), undefined);
    assert.equal(await getUser(client, guild, "21154535154122753", true), undefined);
    assert.equal(await mentionToObject(client, "<#21154535154122753>", "channel", { guild }), undefined);
    assert.equal(await mentionToObject(client, "<@&21154535154122753>", "role", { guild }), undefined);
});

test("banner command falls back when rest banner lookup fails", async () => {
    const BannerCommand = (await import("../commands/general/media/banner.js")).default;
    const command = Object.assign(Object.create(BannerCommand.prototype), {
        type: "classic",
        guild: { id: "guild" },
        member: {
            id: "self",
            bannerURL: () => "https://example.com/self.png",
        },
        author: {
            id: "self",
            bannerURL: () => "https://example.com/author.png",
        },
        args: [],
        client: {
            rest: {
                guilds: {
                    getMember: async () => {
                        throw new Error("missing member");
                    },
                },
                users: {
                    get: async () => {
                        throw new Error("missing user");
                    },
                },
            },
        },
        getOptionMember: () => ({ id: "target", bannerURL: () => undefined }),
        getOptionUser: () => undefined,
        getOptionBoolean: () => true,
        getString: (key) => key,
    });

    assert.equal(await command.run(), "https://example.com/self.png");
});

test("stats command tolerates missing owner and shard map entries", async () => {
    const StatsCommand = (await import("../commands/general/serverinfo/stats.js")).default;
    const previousOwners = process.env.OWNERS;
    process.env.OWNERS = "21154535154122753";
    const command = Object.assign(Object.create(StatsCommand.prototype), {
        permissions: {
            has: () => true,
        },
        guild: { id: "guild" },
        client: {
            uptime: 1000,
            users: new Map(),
            guilds: new Map(),
            shards: new Map(),
            guildShardMap: {},
            user: {
                avatarURL: () => "https://example.com/gabe.png",
            },
            rest: {
                users: {
                    get: async () => {
                        throw new Error("missing owner");
                    },
                },
            },
        },
        getString: (key, data) => {
            if (key === "managedBy") return `managed by ${data.params.owner}`;
            if (key === "timeFormat") return "time";
            if (key === "commands.responses.stats.processOnly") return `process ${data.params.count}`;
            return key;
        },
    });

    try {
        const result = await command.run();
        const shardField = result.embeds[0].fields.find((field) => field.name === "commands.responses.stats.shard");

        assert.equal(result.embeds[0].description, "managed by N/A");
        assert.equal(shardField.value, "N/A");
    } finally {
        if (previousOwners === undefined) delete process.env.OWNERS;
        else process.env.OWNERS = previousOwners;
    }
});
