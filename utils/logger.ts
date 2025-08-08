const logger = (...args: unknown[]): void => {
  if (process.env.DEBUG) {
    console.log(...args);
  }
};

export default logger;
