import pino from "pino";
import env from "@/lib/config/env";

const level = env.LOG_LEVEL || "info";

const logger = pino({ level });

export const { info, error, warn, debug } = logger;

export default logger;
