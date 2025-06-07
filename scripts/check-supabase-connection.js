#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function run() {
  try {
    const { data, error } = await supabase.rpc('get_current_schema_version');
    if (error) {
      throw error;
    }
    console.log('Supabase connected. Current schema version:', data);
  } catch (err) {
    console.error('Connection failed:', err.message || err);
    process.exit(1);
  }
}

run();
