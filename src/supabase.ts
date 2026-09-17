import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client instance
let supabaseClient: SupabaseClient | null = null;

export const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_HeDPdD-SWAOVay-aPm8AZw_YC5HZe4F';

// Helper to normalize Supabase URL and prevent "Invalid path specified"
export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();

  // If user pasted something without https://
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

export function getStoredSupabaseConfig() {
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_PUBLISHABLE_KEY;

  const localUrl = localStorage.getItem('rtx_supabase_url') || '';
  const localKey = localStorage.getItem('rtx_supabase_key') || '';

  const finalUrl = normalizeSupabaseUrl(localUrl || envUrl || '');
  const finalKey = (localKey || envKey || DEFAULT_PUBLISHABLE_KEY).trim();

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
  return Boolean(url && key && url.startsWith('http') && !url.includes('example.supabase.co') && url.includes('.supabase.co'));
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
export const SUPABASE_SQL_SETUP_GUIDE = `-- 🟢 RTX_VOICE Idempotent Database Schema (بدون ارور در اجرای مجدد)
-- این متن را به طور کامل در تب SQL Editor پنل Supabase کپی کرده و Run را بزنید:

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

-- ۴. ساخت تریگر برای ساخت اتوماتیک پروفایل با نقش member پس از ثبت‌نام
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

-- ۵. اضافه کردن ایمن جداول به Realtime (جلوگیری از خطای 42710)
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

-- ۶. تنظیمات RLS (حذف پالیسی قبلی در صورت وجود و ساخت مجدد)
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
