import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/config"

export const createClient = () => createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
