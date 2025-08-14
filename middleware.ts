import { wrapMiddlewareWithSentry } from '@sentry/nextjs';

import { middleware as baseMiddleware } from './src/server/middleware';

export const middleware = wrapMiddlewareWithSentry(baseMiddleware);

export const config = {
  matcher: ['/((?!_next/|icons/|manifest|favicon|.*\\.(?:png|jpg|jpeg|webp|avif|svg)).*)'],
};
