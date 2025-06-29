import type { RequestInit, RequestInfo } from "@supabase/node-fetch"
import fetch from "@supabase/node-fetch"
import { Agent as HttpAgent } from "http"
import { Agent as HttpsAgent } from "https"

const httpAgent = new HttpAgent({ keepAlive: true })
const httpsAgent = new HttpsAgent({ keepAlive: true })

export function keepAliveFetch(url: RequestInfo, init: RequestInit = {}) {
  const agent = (typeof url === "string" ? url : url.toString()).startsWith("https")
    ? httpsAgent
    : httpAgent
  return fetch(url, { ...init, agent })
}
