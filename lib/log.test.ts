import { describe, expect, it } from "vitest";

import { createLogger, serializeLogValue, type LogLevel } from "@/lib/log";

function capture() {
  const lines: Array<{ level: LogLevel; line: string }> = [];
  return {
    lines,
    sink: (level: LogLevel, line: string) => {
      lines.push({ level, line });
    },
  };
}

const FIXED_NOW = () => new Date("2026-07-03T12:34:56.789Z");

describe("createLogger", () => {
  it("emits one JSON object per line in json format", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "debug", now: FIXED_NOW });

    log.info("hello", { country: "sz" });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!.line)).toEqual({
      level: "info",
      time: "2026-07-03T12:34:56.789Z",
      msg: "hello",
      scope: "test",
      country: "sz",
    });
  });

  it("emits a human-readable line in pretty format", () => {
    const { lines, sink } = capture();
    const log = createLogger("sync", { sink, format: "pretty", level: "debug", now: FIXED_NOW });

    log.warn("page failed", { page: 3 });

    expect(lines[0]!.line).toBe('12:34:56.789 WARN  [sync] page failed {"page":3}');
  });

  it("omits the context blob in pretty format when there is none", () => {
    const { lines, sink } = capture();
    const log = createLogger(undefined, { sink, format: "pretty", level: "debug", now: FIXED_NOW });

    log.info("plain");

    expect(lines[0]!.line).toBe("12:34:56.789 INFO  plain");
  });

  it("suppresses entries below the level threshold", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "warn" });

    log.debug("nope");
    log.info("nope");
    log.warn("yes");
    log.error("yes");

    expect(lines.map((entry) => entry.level)).toEqual(["warn", "error"]);
  });

  it("emits nothing at level silent", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "silent" });

    log.error("nope");

    expect(lines).toHaveLength(0);
  });

  it("routes each level to the sink with the level attached", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "debug" });

    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    expect(lines.map((entry) => entry.level)).toEqual(["debug", "info", "warn", "error"]);
  });

  it("child loggers bind context and nest", () => {
    const { lines, sink } = capture();
    const log = createLogger("webhook", { sink, format: "json", level: "debug" });
    const child = log.child({ country: "sz" }).child({ requestId: "r-1" });

    child.info("handled", { action: "post_published" });

    const entry = JSON.parse(lines[0]!.line);
    expect(entry).toMatchObject({
      scope: "webhook",
      country: "sz",
      requestId: "r-1",
      action: "post_published",
    });
  });

  it("call-site context overrides bound context keys", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "debug" }).child({ country: "sz" });

    log.info("switch", { country: "ng" });

    expect(JSON.parse(lines[0]!.line).country).toBe("ng");
  });

  it("serializes a bare Error argument under err with name/message/stack", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "debug" });

    log.error("boom", new TypeError("bad input"));

    const entry = JSON.parse(lines[0]!.line);
    expect(entry.err.name).toBe("TypeError");
    expect(entry.err.message).toBe("bad input");
    expect(typeof entry.err.stack).toBe("string");
  });

  it("serializes Errors nested inside context objects", () => {
    const { lines, sink } = capture();
    const log = createLogger("test", { sink, format: "json", level: "debug" });
    const cause = Object.assign(new Error("nested"), { code: "ECONNREFUSED" });

    log.warn("fetch failed", { attempt: 2, cause });

    const entry = JSON.parse(lines[0]!.line);
    expect(entry.attempt).toBe(2);
    expect(entry.cause).toMatchObject({ name: "Error", message: "nested", code: "ECONNREFUSED" });
  });
});

describe("serializeLogValue", () => {
  it("replaces circular references instead of throwing", () => {
    const value: Record<string, unknown> = { name: "loop" };
    value.self = value;

    expect(serializeLogValue(value)).toEqual({ name: "loop", self: "[Circular]" });
  });

  it("recurses into arrays", () => {
    const result = serializeLogValue([new Error("in-array"), 1]) as unknown[];

    expect(result[0]).toMatchObject({ name: "Error", message: "in-array" });
    expect(result[1]).toBe(1);
  });

  it("passes primitives through untouched", () => {
    expect(serializeLogValue("s")).toBe("s");
    expect(serializeLogValue(42)).toBe(42);
    expect(serializeLogValue(null)).toBeNull();
  });
});
