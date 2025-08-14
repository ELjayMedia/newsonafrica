import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;

function ip(req: Request) {
  return (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim();
}

function rl(window: string, points: number) {
  return redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(points, window) }) : null;
}

export const limits = {
  otp: rl('15 m', 5),
  comment: rl('10 m', 20),
  bookmark: rl('10 m', 60),
};

export async function guard(req: Request, name: keyof typeof limits) {
  const r = limits[name];
  if (!r) return { ok: true } as const;
  const key = `${name}:${ip(req)}`;
  const res = await r.limit(key);
  return { ok: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
}
