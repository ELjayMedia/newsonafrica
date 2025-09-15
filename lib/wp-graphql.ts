import { GraphQLClient } from 'graphql-request';
import { resolveGraphQLEndpoint } from './country';

const TIMEOUT_MS = 10000;
const RETRIES = 2;

async function wpFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let attempt = 0;
  while (attempt <= RETRIES) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (error) {
      if (attempt === RETRIES) {
        throw new Error(
          `WordPress GraphQL endpoint unreachable: ${
            (error as Error).message
          }`,
        );
      }
      attempt++;
    } finally {
      clearTimeout(id);
    }
  }
  throw new Error('WordPress GraphQL endpoint unreachable');
}

export function wpClient(countryCode?: string) {
  const endpoint = resolveGraphQLEndpoint(countryCode || '');
  return new GraphQLClient(endpoint, { fetch: wpFetch });
}
