import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/wordpress/http";

describe("fetchWithTimeout", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("aborts the request once the timeout elapses", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_resource: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }) as unknown as typeof fetch;

    const promise = fetchWithTimeout("https://example.com", { timeout: 50 });
    const assertion = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it("passes through a successful response", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 })) as unknown as typeof fetch;
    const response = await fetchWithTimeout("https://example.com", { timeout: 1000 });
    expect(response.status).toBe(200);
  });
});

describe("fetchWithRetry", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries a 500 response and eventually succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = fetchWithRetry("https://example.com", {
      attempts: 2,
      backoffMs: 100,
      backoffFactor: 2,
    });

    await vi.advanceTimersByTimeAsync(100);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After on a 429 response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "3" } }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const promise = fetchWithRetry("https://example.com", {
      attempts: 2,
      backoffMs: 100,
    });

    await vi.advanceTimersByTimeAsync(3000);
    await promise;

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays).toContain(3000);
  });

  it("does not retry a 4xx client error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await fetchWithRetry("https://example.com", { attempts: 3, backoffMs: 10 });

    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting attempts on repeated network errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = fetchWithRetry("https://example.com", { attempts: 3, backoffMs: 10 });
    const assertion = expect(promise).rejects.toThrow("network down");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
