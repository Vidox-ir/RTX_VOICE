import React, { useState } from 'react';
import { getSupabase, isSupabaseConfigured, getStoredSupabaseConfig } from '../supabase';
import { GAMING_AVATARS } from '../avatars';
import { Mail, Lock, User, Sparkles, ShieldCheck, AlertCircle, LogIn, UserPlus, Database, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenDbModal: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenDbModal,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(GAMING_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();
  const { url } = getStoredSupabaseConfig();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isConfigured) {
      setErrorMsg('ابتدا لازم است آدرس دیتابیس Supabase را در بخش DB وارد کنید.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg('خطا در بارگذاری سرویس دیتابیس.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              username: username.trim() || email.split('@')[0],
              avatar_url: selectedAvatar,
            },
          },
        });

        if (error) {
          // If error contains invalid path or similar
          if (error.message.includes('Invalid path') || error.message.includes('URL')) {
            setErrorMsg(`خطای آدرس پروژه: آدرس وارد شده در DB معتبر نیست یا مسیر اضافه دارد. آدرس فعلی: ${url}`);
          } else {
            setErrorMsg(error.message);
          }
        } else {
          setSuccessMsg('ثبت نام با موفقیت انجام شد! در حال انتقال...');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1000);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('ایمیل یا رمز عبور اشتباه است.');
          } else if (error.message.includes('Invalid path') || error.message.includes('URL')) {
            setErrorMsg(`خطای آدرس URL دیتابیس در بخش DB: لطفاً آدرس را به صورت https://xxxx.supabase.co تنظیم کنید.`);
          } else {
            setErrorMsg(error.message);
          }
        } else {
          setSuccessMsg('ورود با موفقیت انجام شد!');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 800);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ارتباط با سرور.';
      if (msg.includes('Invalid path')) {
        setErrorMsg('خطای Invalid path: آدرس Supabase وارد شده دارای اسلش یا مسیر اضافی در انتهاست. وارد بخش DB شده و آدرس را چک کنید.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1e1f22] border border-[#35363c] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#76b900]/20 text-[#76b900] border border-[#76b900]/40 flex items-center justify-center font-black text-base mx-auto mb-3 shadow-[0_0_15px_rgba(118,185,0,0.3)]">
            RTX
          </div>
          <h2 className="text-xl font-black text-white">
            {isSignUp ? 'ثبت‌نام در سرور RTX_VOICE' : 'ورود به حساب کاربری'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {isSignUp
              ? 'با ایمیل ثبت‌نام کنید. تمام کاربران ابتدا با رول Member وارد می‌شوند.'
              : 'ایمیل و رمزعبور خود را جهت ورود وارد کنید.'}
          </p>
        </div>

        {/* Supabase Notice if not configured */}
        {!isConfigured && (
          <div className="mx-6 mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">آدرس پروژه Supabase هنوز وارد نشده است.</span>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                برای اتصال دیتابیس واقعی، لازم است آدرس پروژه‌تان را در بخش DB وارد کنید.
              </p>
              <button
                type="button"
                onClick={onOpenDbModal}
                className="mt-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-xs font-bold text-white transition flex items-center gap-1"
              >
                <Database className="w-3.5 h-3.5" />
                تنظیم آدرس URL دیتابیس ➔
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="px-6 pb-6 space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                نام کاربری گیمری (Gamer Tag)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: Shadow_Striker"
                  className="w-full bg-[#111214] border border-[#35363c] rounded-xl pr-3.5 pl-10 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#5865f2] transition"
                />
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              ایمیل (Email)
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="youremail@example.com"
                className="w-full bg-[#111214] border border-[#35363c] rounded-xl pr-3.5 pl-10 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#5865f2] transition font-mono text-xs dir-ltr text-right"
              />
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              رمز عبور (حداقل ۶ کاراکتر)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111214] border border-[#35363c] rounded-xl pr-3.5 pl-10 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#5865f2] transition font-mono text-xs dir-ltr text-right"
              />
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Gaming Avatar picker */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                انتخاب آواتار گیمینگ هوش مصنوعی
              </label>
              <div className="grid grid-cols-4 gap-2">
                {GAMING_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`rounded-xl overflow-hidden aspect-square border-2 p-1 bg-[#111214] transition ${
                      selectedAvatar === av
                        ? 'border-[#76b900] ring-2 ring-[#76b900]/40'
                        : 'border-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    <img src={av} alt="Avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">
                <span>{errorMsg}</span>
                {errorMsg.includes('DB') && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDbModal();
                    }}
                    className="block mt-1 font-bold underline text-amber-300 hover:text-white"
                  >
                    اصلاح آدرس در پنجره تنظیمات دیتابیس ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 bg-[#2b2d31] hover:bg-[#35363c] text-neutral-300 rounded-xl font-bold text-sm transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">در حال ارتباط با سرور...</span>
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" /> ساخت حساب کاربری
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> ورود به حساب
                </>
              )}
            </button>
          </div>

          {/* Toggle login vs register */}
          <div className="pt-2 text-center text-xs text-neutral-400 border-t border-[#35363c]">
            {isSignUp ? (
              <span>
                قبلاً اکانت ساخته‌اید؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMsg('');
                  }}
                  className="text-[#5865f2] hover:underline font-bold"
                >
                  ورود به حساب
                </button>
              </span>
            ) : (
              <span>
                هنوز حسابی ندارید؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMsg('');
                  }}
                  className="text-[#5865f2] hover:underline font-bold"
                >
                  ثبت‌نام رایگان
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
