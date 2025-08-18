import pino from "pino";

const level = process.env.LOG_LEVEL || "info";

const logger = pino({ level });

export const { info, error, warn, debug } = logger;

export default logger;
