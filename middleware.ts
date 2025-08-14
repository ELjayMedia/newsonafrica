import { wrapMiddlewareWithSentry } from '@sentry/nextjs';

import { middleware as baseMiddleware, config } from './src/server/middleware';

export const middleware = wrapMiddlewareWithSentry(baseMiddleware);
export { config };
