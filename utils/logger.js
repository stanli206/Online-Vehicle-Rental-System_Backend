import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Structured logger.
// - Production: raw JSON (ready for log aggregators like Datadog/CloudWatch/Loki).
// - Development: pretty, colorized, human-readable output.
// - Test: silent, to keep test output clean.
const logger = pino({
  level: isTest ? "silent" : process.env.LOG_LEVEL || "info",
  transport:
    isProd || isTest
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
});

export default logger;
