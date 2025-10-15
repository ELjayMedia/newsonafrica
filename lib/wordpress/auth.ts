import { Buffer } from "node:buffer"

export interface WordPressAuthEnv {
  username?: string
  password?: string
  jwtAuthEndpoint?: string
  jwtRefreshEndpoint?: string
  jwtToken?: string
  explicitAuthorizationHeader?: string
}

const env: WordPressAuthEnv = {
  username: process.env.WP_APP_USER?.trim(),
  password: process.env.WP_APP_PASS,
  jwtAuthEndpoint: process.env.WP_APP_JWT_AUTH_ENDPOINT?.trim(),
  jwtRefreshEndpoint: process.env.WP_APP_JWT_REFRESH_ENDPOINT?.trim(),
  jwtToken: process.env.WP_APP_JWT_TOKEN?.trim(),
  explicitAuthorizationHeader: process.env.WP_APP_AUTH_HEADER?.trim(),
}

const buildBasicAuthHeader = (username?: string, password?: string): string | null => {
  if (!username || password === undefined) {
    return null
  }

  const normalizedPassword = String(password)
  const token = Buffer.from(`${username}:${normalizedPassword}`, "utf8").toString("base64")
  return `Basic ${token}`
}

const normalizeBearerToken = (token: string): string =>
  token.startsWith("Bearer ") ? token : `Bearer ${token}`

const computeAuthorizationHeader = (): string | null => {
  if (env.explicitAuthorizationHeader) {
    return env.explicitAuthorizationHeader
  }

  if (env.jwtToken) {
    return normalizeBearerToken(env.jwtToken)
  }

  const basic = buildBasicAuthHeader(env.username, env.password)
  return basic
}

const authorizationHeader = computeAuthorizationHeader()

export const getWordPressAuthorizationHeader = (): string | null => authorizationHeader

export const getWordPressAuthEnv = (): WordPressAuthEnv => ({ ...env })
