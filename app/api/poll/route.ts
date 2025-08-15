import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClient() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function formatPoll(row: any) {
  return {
    id: row.id,
    question: row.question,
    options: (row.options || []).map((o: any) => ({
      id: o.id,
      label: o.label,
      votes: o.votes ?? 0,
    })),
  };
}

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await (supabase as any)
      .from('polls')
      .select('id, question, options:poll_options(id,label,votes)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ id: '', question: '', options: [] });
    }

    return NextResponse.json(formatPoll(data));
  } catch (err) {
    console.error('Error fetching poll:', err);
    return NextResponse.json({ id: '', question: '', options: [] }, {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    const { optionId } = await req.json();
    if (!optionId) {
      return NextResponse.json({ error: 'Missing optionId' }, { status: 400 });
    }

    const supabase = getClient();

    const { data: option, error: optionError } = await (supabase as any)
      .from('poll_options')
      .select('id, poll_id, votes')
      .eq('id', optionId)
      .single();

    if (optionError || !option) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
    }

    const { error: updateError } = await (supabase as any)
      .from('poll_options')
      .update({ votes: (option.votes || 0) + 1 })
      .eq('id', optionId);

    if (updateError) {
      console.error('Vote update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 },
      );
    }

    const { data: pollRow, error: pollError } = await (supabase as any)
      .from('polls')
      .select('id, question, options:poll_options(id,label,votes)')
      .eq('id', option.poll_id)
      .single();

    if (pollError || !pollRow) {
      return NextResponse.json(
        { error: 'Failed to fetch poll' },
        { status: 500 },
      );
    }

    const poll = formatPoll(pollRow);
    poll.userHasVoted = true;
    return NextResponse.json(poll);
  } catch (err) {
    console.error('Error recording vote:', err);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 },
    );
  }
}
