// eslint-disable-next-line import-x/order
import process from "node:process";

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(`You are currently running Node.js version ${process.versions.node}.
I need at least Node.js 22.X or more. Just try 22. Use nvm install 22 to install Node 22.`);
  process.exit(1);
}
if (process.platform === "win32") {
  console.error(
    "\x1b[1m\x1b[31m\x1b[40m" +
      `WINDOWS IS NOT OFFICIALLY SUPPORTED!
Although there's a (very) slim chance of it working, multiple aspects of Gabe are built with UNIX-like systems in mind and could break on Win32-based systems. If you want to run Gabe on Windows, using Windows Subsystem for Linux is highly recommended.
Gabe will continue to run past this message in 5 seconds, but keep in mind that it could break at any time. Continue running at your own risk; alternatively, stop the bot using Ctrl+C and install WSL.` +
      "\x1b[0m",
  );
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

// load config from .env file
import "dotenv/config";

if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== "") await import("./utils/sentry.ts");

if (!process.env.TOKEN) {
  console.error(`No token was provided! I cannot physically exist if I do not have a Discord bot token.
Please give me one. Thanks.`);
  process.exit(1);
}

if (process.env.TOKEN.length < 59) {
  console.error(`Incorrect bot token length!
You may have posted the OAuth2 secret. That's not right. Please find the other token.`);
  process.exit(1);
}

import { execFile as baseExecFile } from "node:child_process";
import { glob, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ActivityTypes, Client, type ClientEvents, Constants } from "oceanic.js";
import commandConfig from "#config/commands.json" with { type: "json" };
import { locales, paths } from "#utils/collections.js";
import detectRuntime from "#utils/detectRuntime.js";
import { load } from "#utils/handler.js";
import { initImageLib, reloadImageConnections } from "#utils/image.js";
import logger from "#utils/logger.js";
import { endBroadcast, exit, startBroadcast } from "#utils/misc.js";
import { connect, connected, reload } from "#utils/soundplayer.js";
import { parseThreshold } from "#utils/tempimages.js";
import packageJson from "../package.json" with { type: "json" };
import { init as dbInit } from "./database.ts";

process.env.ESMBOT_VER = packageJson.version;

const intents = [Constants.Intents.GUILD_VOICE_STATES, Constants.Intents.DIRECT_MESSAGES, Constants.Intents.GUILDS];
if (commandConfig.types.classic) {
  intents.push(Constants.Intents.GUILD_MESSAGES);
  intents.push(Constants.Intents.MESSAGE_CONTENT);
}

const runtime = detectRuntime();

const execFile = promisify(baseExecFile);

process.env.GIT_REV = await execFile("git", ["rev-parse", "HEAD"]).then(
  (output) => output.stdout.substring(0, 7),
  () => "unknown commit",
);
console.log(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣷⣤⣙⢻⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⡿⠛⠛⠿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀⠙⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣿⠿⣆⠀⠀⠀⠀
⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⠀
⠀⢀⣾⣿⣿⠿⠟⠛⠋⠉⠉⠀⠀⠀⠀⠀⠀⠉⠉⠙⠛⠻⠿⣿⣿⣷⡀⠀
⣠⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⣄
gabe. ${packageJson.version}
`);

if (!commandConfig.types.classic && !commandConfig.types.application) {
  logger.error("Bruh. Both classic and application commands are disabled.");
  process.exit(1);
}

const database = await dbInit();
if (database) {
  // database handling
  const dbResult = await database.upgrade();
  if (dbResult === 1) process.exit(1);
}

// process the threshold into bytes early
if (process.env.TEMPDIR && process.env.THRESHOLD) {
  await parseThreshold();
}

const basePath = dirname(fileURLToPath(import.meta.url));

// register locales
logger.log("info", "Attempting to load some language data...");
for await (const localeFile of glob(resolve(basePath, "..", "locales", "*.json"))) {
  logger.log("main", `Loading locales from ${localeFile}...`);
  try {
    const commandArray = localeFile.split("/");
    const localeName = commandArray[commandArray.length - 1].split(".")[0];
    const data = await readFile(localeFile, { encoding: "utf8" });
    locales.set(localeName, JSON.parse(data));
  } catch (e) {
    logger.error(`Failed to register locales from ${localeFile}: ${e}`);
  }
}
logger.log("info", "Finished loading them locales.");

// register commands and their info
logger.log("info", "Attempting to load commands... by the way I have spinal issues");
for await (const commandFile of glob(resolve(basePath, "..", "commands", "*", runtime.tsLoad ? "*.{js,ts}" : "*.js"))) {
  try {
    await load(null, commandFile);
  } catch (e) {
    logger.error(`Failed to register command from ${commandFile}: ${e}`);
  }
}
logger.log("info", "Finished loading commands.");

if (database) {
  await database.setup();
}
if (process.env.API_TYPE === "ws") await reloadImageConnections();
else initImageLib();

const shardArray =
  process.env.SHARDS && process.env.pm_id
    ? JSON.parse(process.env.SHARDS)[Number.parseInt(process.env.pm_id) - 1]
    : null;

// create the oceanic client
const client = new Client({
  auth: `Bot ${process.env.TOKEN}`,
  allowedMentions: {
    everyone: false,
    roles: false,
    users: true,
    repliedUser: true,
  },
  gateway: {
    concurrency: "auto",
    maxShards: "auto",
    shardIDs: shardArray,
    presence: {
      status: "online",
      activities: [
        {
          type: ActivityTypes.GAME,
          name: "Starting Gabe...",
        },
      ],
    },
    intents,
  },
  rest: {
    baseURL: process.env.REST_PROXY && process.env.REST_PROXY !== "" ? process.env.REST_PROXY : undefined,
  },
  collectionLimits: {
    messages: 50,
    channels: !commandConfig.types.classic ? 0 : Number.POSITIVE_INFINITY,
    guildThreads: !commandConfig.types.classic ? 0 : Number.POSITIVE_INFINITY,
    emojis: 0,
  },
});

// register events
logger.log("info", "Loading sum events...");
for await (const file of glob(resolve(basePath, "events", runtime.tsLoad ? "*.{js,ts}" : "*.js"))) {
  logger.log("main", `Loading event from ${file}...`);
  const eventArray = file.split("/");
  const eventName = eventArray[eventArray.length - 1].split(".")[0];
  const { default: event } = await import(file);
  client.on(eventName as keyof ClientEvents, event.bind(null, { client, database }));
}
logger.log("info", "Finished loading events.");

// PM2-specific handling
if (process.env.PM2_USAGE) {
  const { default: pm2 } = await import("pm2");
  // callback hell :)
  pm2.launchBus((err, pm2Bus) => {
    if (err) {
      logger.error(err);
      return;
    }
    pm2.list((err, list) => {
      if (err) {
        logger.error(err);
        return;
      }
      const managerProc = list.find((v) => v.name === "Gabe-manager");
      pm2Bus.on("process:msg", async (packet: { data?: { type: string; from?: string; message: string } }) => {
        if (packet.data?.from === process.env.pm_id) return;
        switch (packet.data?.type) {
          case "reload": {
            const cmdPath = paths.get(packet.data.message);
            if (cmdPath) await load(client, cmdPath, true);
            break;
          }
          case "soundreload":
            await reload(client);
            break;
          case "imagereload":
            await reloadImageConnections();
            break;
          case "broadcastStart":
            startBroadcast(client, packet.data.message);
            break;
          case "broadcastEnd":
            endBroadcast(client);
            break;
          case "eval":
            eval(packet.data.message);
            break;
          case "serverCounts":
            if (!managerProc) break;
            pm2.sendDataToProcessId(
              managerProc.pm_id as number,
              {
                id: managerProc.pm_id,
                type: "process:msg",
                data: {
                  type: "serverCounts",
                  guilds: client.guilds.size,
                  shards: client.shards.map((v) => {
                    return {
                      id: v.id,
                      procId: Number.parseInt(process.env.pm_id as string),
                      latency: v.latency,
                      status: v.status,
                    };
                  }),
                },
                topic: true,
              },
              (err) => {
                if (err) logger.error(err);
              },
            );
            break;
        }
      });
    });
  });
}

// connect to lavalink
if (!connected) connect(client);

process.on("SIGINT", async () => {
  logger.info("SIGINT detected, I'm not doing this...");
  await exit(client, database);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM detected, absolutely not...");
  await exit(client, database);
});

try {
  await client.connect();
} catch (e) {
  logger.error("Gabe failed to connect to Discord!");
  logger.error(e);
  logger.error("I can't start. Goodbye suckers...");
  process.exit(1);
}
