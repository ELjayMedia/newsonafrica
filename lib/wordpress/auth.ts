export function getWordPressAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  const username = process.env.WP_APP_USERNAME
  const password = process.env.WP_APP_PASSWORD

  if (username && password) {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64")
    headers["Authorization"] = `Basic ${credentials}`
  }

  return headers
}
