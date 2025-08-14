import * as Sentry from '@sentry/nextjs';

const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.2 : 1.0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate,
  environment: process.env.NODE_ENV,
});
