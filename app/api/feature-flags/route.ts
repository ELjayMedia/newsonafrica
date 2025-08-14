import { NextResponse } from 'next/server';

import { getFeatureFlag } from '@/lib/flags';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const country = searchParams.get('country') ?? undefined;
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const enabled = await getFeatureFlag(name, country);
  return NextResponse.json({ enabled });
}
