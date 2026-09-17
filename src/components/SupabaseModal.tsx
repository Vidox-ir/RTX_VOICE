import React, { useState } from 'react';
import { getStoredSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured, SUPABASE_SQL_SETUP_GUIDE, normalizeSupabaseUrl } from '../supabase';
import { Database, Copy, Check, ExternalLink, HelpCircle, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SupabaseModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [urlError, setUrlError] = useState('');

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP_GUIDE);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSave = () => {
    setUrlError('');
    const cleanUrl = normalizeSupabaseUrl(url);

    if (!cleanUrl || !cleanUrl.includes('.supabase.co')) {
      setUrlError('آدرس نامعتبر است! آدرس باید به صورت https://xxxx.supabase.co باشد.');
      return;
    }

    saveSupabaseConfig(cleanUrl, key);
    setStatusMsg('تنظیمات با موفقیت ذخیره شد!');
    onSaved();
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1e1f22] border border-[#35363c] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#35363c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#23a55a]/20 text-[#23a55a] flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">اتصال دیتابیس آنلاین Supabase</h2>
              <p className="text-xs text-neutral-400">اتصال ابری جهت ذخیره چت‌ها، احراز هویت با ایمیل و وضعیت روم‌های صوتی</p>
            </div>
          </div>
          {isConfigured && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> فعال
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Guide banner */}
          <div className="p-4 bg-[#111214] border border-[#35363c] rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-neutral-200">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#5865f2]" />
                راهنمای رفع ارور Invalid path و راه‌اندازی دیتابیس:
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[#5865f2] hover:underline flex items-center gap-1"
              >
                داشبورد Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              ۱. در پنل Supabase وارد پروژه‌تان شده و از منوی چپ وارد <b>Project Settings &gt; Data API</b> شوید.<br />
              ۲. مقدار <b>Project URL</b> را کپی کنید (فقط دامنه‌ی اصلی، بدون هیچ پسوند یا اسلش اضافی: <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">https://xxxx.supabase.co</code>).<br />
              ۳. در تب <b>SQL Editor</b> دستور زیر را کپی و دکمه <b>Run</b> را بزنید تا تمام جدول‌ها ساخته شوند.
            </p>

            <button
              onClick={handleCopySql}
              className="mt-2 w-full py-2.5 px-3 bg-[#2b2d31] hover:bg-[#35363c] text-white rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-neutral-700 transition"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#5865f2]" />}
              {copiedSql ? 'کد کامل SQL جداول کپی شد!' : 'کپی دستورات SQL دیتابیس (SQL Schema)'}
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Supabase Project URL (آدرس دقیق پروژه)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError('');
                }}
                placeholder="https://xyzabcdefghijklm.supabase.co"
                className="w-full bg-[#111214] border border-[#35363c] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#5865f2] transition font-mono text-xs"
              />
              {urlError ? (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {urlError}
                </p>
              ) : (
                <p className="text-[11px] text-neutral-400 mt-1">
                  نکته: از قرار دادن مسیرهای اضافی مثل <code className="text-rose-400">/auth/v1</code> خودداری کنید. سیستم به صورت خودکار آدرس را تصحیح می‌کند.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Supabase Publishable / Anon Key
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sb_publishable_..."
                className="w-full bg-[#111214] border border-[#35363c] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#5865f2] transition font-mono text-xs"
              />
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ کلید ثبت شده: <span className="font-mono text-[10px]">sb_publishable_HeDPdD...</span>
              </p>
            </div>
          </div>

          {statusMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl text-center font-medium">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#2b2d31] border-t border-[#35363c] flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            {isConfigured ? '🟢 دیتابیس متصل است' : '⚪ در انتظار ورود آدرس دیتابیس'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-[#35363c] rounded-xl transition"
            >
              بستن
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-xl shadow transition"
            >
              ذخیره و فعال‌سازی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
