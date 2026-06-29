// Preload shim: silences the `server-only` guard when running Node scripts
// outside of the Next.js runtime (e.g. backfill, migrations).
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(
  `data:text/javascript,
    export function resolve(specifier, ctx, next) {
      if (specifier === 'server-only') {
        return { shortCircuit: true, url: 'data:text/javascript,' };
      }
      return next(specifier, ctx);
    }
  `,
  pathToFileURL('./')
);
