import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided for RTX_VOICE
const DEFAULT_SUPABASE_URL = 'https://wfaeehlkxbflpuhnoigj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYWVlaGxreGJmbHB1aG5vaWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzU5MDgsImV4cCI6MjEwNTI1MTkwOH0.qJTTb9cRp-XNuYjdP-wJM_Q0WbQQ37greZ46s3Cdu5I';

let supabaseClient: SupabaseClient | null = null;

// Helper to normalize Supabase URL and prevent invalid path like /rest/v1/
export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    return cleaned.replace(/\/+$/, '');
  }
}

// Read configured values from environment, localStorage or fallback defaults
export function getStoredSupabaseConfig() {
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

  let localUrl = localStorage.getItem('rtx_supabase_url') || '';
  let localKey = localStorage.getItem('rtx_supabase_key') || '';

  // Clear if stale, invalid, or example placeholder
  if (localUrl && (!localUrl.includes('.supabase.co') || localUrl.includes('example.supabase.co'))) {
    localStorage.removeItem('rtx_supabase_url');
    localStorage.removeItem('rtx_supabase_key');
    localUrl = '';
    localKey = '';
  }

  const rawUrl = localUrl || envUrl || DEFAULT_SUPABASE_URL;
  const rawKey = localKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

  const finalUrl = normalizeSupabaseUrl(rawUrl);
  const finalKey = rawKey.trim();

  return {
    url: finalUrl,
    key: finalKey,
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = key.trim();

  if (cleanUrl) localStorage.setItem('rtx_supabase_url', cleanUrl);
  if (cleanKey) localStorage.setItem('rtx_supabase_key', cleanKey);
  supabaseClient = null; // reset client
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    !url.includes('example.supabase.co')
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseClient) {
    const { url, key } = getStoredSupabaseConfig();
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Supabase initialization error:', err);
      return null;
    }
  }
  return supabaseClient;
}

// Complete idempotent SQL Schema for Supabase
export const SUPABASE_SQL_SETUP_GUIDE = `-- 🟢 RTX_VOICE Idempotent Database Schema (اجرا در SQL Editor سوپربیس)

-- ۱. ساخت جدول کاربران با نقش‌ها
CREATE TABLE IF NOT EXISTS public.rtx_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT NOT NULL DEFAULT 'Gamer',
  avatar_url TEXT NOT NULL DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=Gamer1',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'vip', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۲. ساخت جدول وضعیت آنلاین بودن در روم‌های صوتی
CREATE TABLE IF NOT EXISTS public.rtx_voice_presence (
  user_id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  user_role TEXT DEFAULT 'member',
  peer_id TEXT,
  is_muted BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  rtx_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۳. ساخت جدول پیام‌های چت
CREATE TABLE IF NOT EXISTS public.rtx_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'member',
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reactions JSONB DEFAULT '{}'::jsonb
);

-- ۴. ساخت تریگر برای ثبت‌نام خودکار پروفایل با نقش member
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.rtx_profiles (id, email, username, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ۵. اضافه کردن ایمن جداول به Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rtx_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rtx_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rtx_voice_presence;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ۶. تنظیمات RLS
ALTER TABLE public.rtx_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles select all" ON public.rtx_profiles;
CREATE POLICY "Profiles select all" ON public.rtx_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Profiles update own" ON public.rtx_profiles;
CREATE POLICY "Profiles update own" ON public.rtx_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.rtx_voice_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Voice presence select all" ON public.rtx_voice_presence;
CREATE POLICY "Voice presence select all" ON public.rtx_voice_presence FOR SELECT USING (true);
DROP POLICY IF EXISTS "Voice presence insert all" ON public.rtx_voice_presence;
CREATE POLICY "Voice presence insert all" ON public.rtx_voice_presence FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Voice presence update all" ON public.rtx_voice_presence;
CREATE POLICY "Voice presence update all" ON public.rtx_voice_presence FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Voice presence delete all" ON public.rtx_voice_presence;
CREATE POLICY "Voice presence delete all" ON public.rtx_voice_presence FOR DELETE USING (true);

ALTER TABLE public.rtx_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages select all" ON public.rtx_messages;
CREATE POLICY "Messages select all" ON public.rtx_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Messages insert all" ON public.rtx_messages;
CREATE POLICY "Messages insert all" ON public.rtx_messages FOR INSERT WITH CHECK (true);
`;
