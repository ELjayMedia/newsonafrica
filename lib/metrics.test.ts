import { describe, expect, it } from "vitest";

import { createMetricsRegistry, seriesKey, type MetricsSnapshot } from "@/lib/metrics";

describe("seriesKey", () => {
  it("returns the bare name without labels", () => {
    expect(seriesKey("webhook.received")).toBe("webhook.received");
    expect(seriesKey("webhook.received", {})).toBe("webhook.received");
  });

  it("sorts label keys for a stable identity", () => {
    expect(seriesKey("sync.page", { page: 2, country: "sz" })).toBe("sync.page{country=sz,page=2}");
    expect(seriesKey("sync.page", { country: "sz", page: 2 })).toBe("sync.page{country=sz,page=2}");
  });
});

describe("createMetricsRegistry", () => {
  it("increments counters, tracking labeled series separately", () => {
    const metrics = createMetricsRegistry();

    metrics.increment("hits");
    metrics.increment("hits");
    metrics.increment("hits", 3, { route: "/search" });

    const snap = metrics.snapshot();
    expect(snap.counters).toEqual({ hits: 2, "hits{route=/search}": 3 });
  });

  it("aggregates timer observations into count/total/min/max", () => {
    const metrics = createMetricsRegistry();

    metrics.observe("op_ms", 10);
    metrics.observe("op_ms", 30);
    metrics.observe("op_ms", 20);

    expect(metrics.snapshot().timers.op_ms).toEqual({ count: 3, totalMs: 60, minMs: 10, maxMs: 30 });
  });

  it("time() records the duration and returns the function result", async () => {
    let tick = 1_000;
    const metrics = createMetricsRegistry(() => tick);

    const result = await metrics.time("work_ms", () => {
      tick += 25;
      return "done";
    });

    expect(result).toBe("done");
    expect(metrics.snapshot().timers.work_ms).toEqual({ count: 1, totalMs: 25, minMs: 25, maxMs: 25 });
  });

  it("time() still records when the function throws, and rethrows", async () => {
    let tick = 0;
    const metrics = createMetricsRegistry(() => tick);

    await expect(
      metrics.time("fail_ms", () => {
        tick += 7;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(metrics.snapshot().timers.fail_ms).toEqual({ count: 1, totalMs: 7, minMs: 7, maxMs: 7 });
  });

  it("snapshot() is a copy — later mutations do not leak into it", () => {
    const metrics = createMetricsRegistry();
    metrics.increment("c");
    metrics.observe("t_ms", 5);

    const snap = metrics.snapshot();
    metrics.increment("c");
    metrics.observe("t_ms", 50);

    expect(snap.counters.c).toBe(1);
    expect(snap.timers.t_ms).toEqual({ count: 1, totalMs: 5, minMs: 5, maxMs: 5 });
  });

  it("flush() hands the exporter a snapshot then resets (delta semantics)", async () => {
    const metrics = createMetricsRegistry();
    metrics.increment("sent", 4);

    const exported: MetricsSnapshot[] = [];
    await metrics.flush({ export: (snapshot) => void exported.push(snapshot) });

    expect(exported).toHaveLength(1);
    expect(exported[0]!.counters).toEqual({ sent: 4 });
    expect(metrics.snapshot().counters).toEqual({});
  });

  it("flush() does not reset when the exporter throws", async () => {
    const metrics = createMetricsRegistry();
    metrics.increment("kept");

    await expect(
      metrics.flush({
        export: () => {
          throw new Error("backend down");
        },
      }),
    ).rejects.toThrow("backend down");

    expect(metrics.snapshot().counters).toEqual({ kept: 1 });
  });
});
