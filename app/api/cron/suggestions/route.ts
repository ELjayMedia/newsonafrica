import { NextResponse } from 'next/server';

import { buildSuggestionIndex } from '@/lib/suggestion-index';

export async function GET() {
  await buildSuggestionIndex();
  return NextResponse.json({ rebuilt: true, at: new Date().toISOString() });
}
