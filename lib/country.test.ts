import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveGraphQLEndpoint } from './country';

const DEFAULT = 'https://default.test/graphql';
const SZ = 'https://sz.test/graphql';

describe('resolveGraphQLEndpoint', () => {
  beforeEach(() => {
    process.env.WP_GRAPHQL_SZ = SZ;
    delete process.env.WP_GRAPHQL_ZA;
    process.env.WP_GRAPHQL_DEFAULT = DEFAULT;
  });

  afterEach(() => {
    delete process.env.WP_GRAPHQL_SZ;
    delete process.env.WP_GRAPHQL_ZA;
    delete process.env.WP_GRAPHQL_DEFAULT;
  });

  it('returns country-specific endpoint when set', () => {
    expect(resolveGraphQLEndpoint('sz')).toBe(SZ);
  });

  it('falls back to default when country not supported', () => {
    expect(resolveGraphQLEndpoint('xx')).toBe(DEFAULT);
  });

  it('falls back to default when country endpoint missing', () => {
    expect(resolveGraphQLEndpoint('za')).toBe(DEFAULT);
  });
});
