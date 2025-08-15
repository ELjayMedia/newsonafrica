const ALLOW = [
  /^https:\/\/newsonafrica\.com\//,
  /^https:\/\/.*\.newsonafrica\.com\//,
  /^https:\/\/[^/]+\.supabase\.co\//,
];

export function isAllowedSrc(src: string): boolean {
  return ALLOW.some((rx) => rx.test(src));
}
