import { beforeEach, expect, test, vi } from "vitest";
import { fetcher, metrics } from "../fetcher";

declare const global: any;

beforeEach(() => {
  vi.resetAllMocks();
  metrics.hits = 0;
  metrics.misses = 0;
});

test("deduplicates concurrent requests", async () => {
  const resp = { ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve({ a: 1 }) };
  const mock = vi.fn().mockResolvedValue(resp);
  global.fetch = mock;
  const [a, b] = await Promise.all([fetcher("https://api.test/1"), fetcher("https://api.test/1")]);
  expect(a).toEqual({ a: 1 });
  expect(b).toEqual({ a: 1 });
  expect(mock).toHaveBeenCalledTimes(1);
});

test("retries on 500 and succeeds", async () => {
  const fail = { ok: false, status: 500, statusText: "err", headers: new Headers(), json: () => Promise.resolve({}) };
  const ok = { ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve({ done: true }) };
  const mock = vi.fn().mockResolvedValueOnce(fail).mockResolvedValueOnce(ok);
  global.fetch = mock;
  const res = await fetcher("https://api.test/2", { retries: 1 });
  expect(res).toEqual({ done: true });
  expect(mock).toHaveBeenCalledTimes(2);
});
