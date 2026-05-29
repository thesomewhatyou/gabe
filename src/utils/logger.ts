import { closeSync, mkdirSync, openSync } from "node:fs";
import process from "node:process";
import winston from "winston";
import "winston-daily-rotate-file";

const shouldWriteLogFiles =
  process.env.GABE_LOG_TO_FILE !== "false" &&
  !process.env.NODE_TEST_CONTEXT &&
  !process.execArgv.includes("--test") &&
  canWriteLogFiles();

function canWriteLogFiles() {
  try {
    mkdirSync("logs", { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    closeSync(openSync(`logs/error-${date}.log`, "a"));
    closeSync(openSync(`logs/main-${date}.log`, "a"));
    return true;
  } catch {
    return false;
  }
}

function createFileTransport(options: ConstructorParameters<typeof winston.transports.DailyRotateFile>[0]) {
  const transport = new winston.transports.DailyRotateFile(options);
  transport.on("error", (error) => {
    console.warn(`File logging disabled after write error: ${(error as Error).message}`);
  });
  return transport;
}

const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    main: 3,
    debug: 4,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.colorize({ all: true }),
      stderrLevels: ["error", "warn"],
    }),
    ...(shouldWriteLogFiles
      ? [
          createFileTransport({
            filename: "logs/error-%DATE%.log",
            level: "error",
            zippedArchive: true,
            maxSize: 4194304,
            maxFiles: 8,
          }),
          createFileTransport({
            filename: "logs/main-%DATE%.log",
            zippedArchive: true,
            maxSize: 4194304,
            maxFiles: 8,
          }),
        ]
      : []),
  ],
  level: process.env.DEBUG_LOG ? "debug" : "main",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((info) => {
      const { timestamp, level, message, ...args } = info;

      return `[${timestamp}]: [${level.toUpperCase()}] - ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ""}`;
    }),
  ),
});

winston.addColors({
  info: "green",
  main: "gray",
  debug: "magenta",
  warn: "yellow",
  error: "red",
});

type LogFunction = (type: string, ...content: string[]) => void;
type TypedLogFunction = (...args: (string | Error | object | unknown)[]) => void;

export interface Logger {
  log: LogFunction;
  info: TypedLogFunction;
  error: TypedLogFunction;
  warn: TypedLogFunction;
  debug: TypedLogFunction;
}

export function log(type: string, content: string | Error | object | unknown | null) {
  return content ? logger.log(type === "log" ? "main" : type, content) : logger.info(type);
}

export function info(args: string | Error | object | unknown) {
  return log("info", args);
}

export function error(args: string | Error | object | unknown) {
  return log("error", args);
}

export function warn(args: string | Error | object | unknown) {
  return log("warn", args);
}

export function debug(args: string | Error | object | unknown) {
  return log("debug", args);
}

export default {
  log,
  info,
  error,
  warn,
  debug,
} as Logger;
