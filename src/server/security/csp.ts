export function buildCsp({ nonce, prod }: { nonce: string; prod: boolean }) {
  const self = "'self'";
  const gpt = 'https://securepubads.g.doubleclick.net https://www.googletagservices.com';
  const supabase = 'https://*.supabase.co';
  const noa = 'https://newsonafrica.com https://*.newsonafrica.com';
  const algolia = 'https://*.algolia.net https://*.algolia.io';
  const img = `${self} data: blob: ${noa} ${supabase}`;
  const ws = prod ? "'none'" : 'wss:';
  return [
    `default-src ${self}`,
    `script-src ${self} 'nonce-${nonce}' ${prod ? '' : "'unsafe-eval'"} ${gpt}`,
    `style-src ${self} 'unsafe-inline'`,
    `img-src ${img}`,
    `font-src ${self} data:`,
    `connect-src ${self} ${noa} ${supabase} ${algolia} ${ws}`,
    `frame-src ${self} ${gpt}`,
    `object-src 'none'`,
    `base-uri ${self}`,
    `form-action ${self}`,
    `upgrade-insecure-requests`,
  ].join('; ');
}
