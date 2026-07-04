/**
 * Shared-secret guard for the admin content-sync routes (NOA-87). Accepts
 * either an `x-content-sync-secret` header or a `Authorization: Bearer`
 * token, compared against `serverEnv.CONTENT_SYNC_SECRET`.
 */
import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";

function readProvidedSecret(request: NextRequest): string {
  const headerToken = request.headers.get("x-content-sync-secret")?.trim();
  if (headerToken) return headerToken;

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return "";
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Returns true when the request presents the configured content-sync secret. */
export function isAuthorizedContentSyncRequest(request: NextRequest): boolean {
  const provided = readProvidedSecret(request);
  if (!provided) return false;
  return safeEqual(provided, serverEnv.CONTENT_SYNC_SECRET);
}
