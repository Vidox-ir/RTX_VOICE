import React, { useState } from 'react';
import { AppUser } from '../types';
import { GAMING_AVATARS } from '../avatars';
import { UserCheck, Crown, Star, User, Lock, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onUpdateUser: (updated: Partial<AppUser>) => void;
  onSignOut?: () => void;
  isSupabaseLoggedIn?: boolean;
}

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSignOut,
  isSupabaseLoggedIn,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUser({
      name: name.trim() || 'کاربر RTX',
      avatar: selectedAvatar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1e1f22] border border-[#35363c] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header banner */}
        <div className="h-24 bg-gradient-to-r from-[#111214] via-[#76b900]/40 to-[#111214] border-b border-[#35363c] relative p-4 flex justify-end items-start">
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full bg-black/40 hover:bg-black/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Avatar section */}
        <div className="px-6 -mt-12 mb-4 flex items-end justify-between">
          <div className="flex items-end gap-3">
            <div className="w-20 h-20 rounded-2xl border-4 border-[#1e1f22] bg-[#111214] overflow-hidden shadow-lg p-1">
              <img
                src={selectedAvatar}
                alt="Avatar"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="pb-1">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : currentUser.role === 'vip'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {currentUser.role === 'admin' && <Crown className="w-3 h-3" />}
                {currentUser.role === 'vip' && <Star className="w-3 h-3" />}
                {currentUser.role === 'member' && <User className="w-3 h-3" />}
                {currentUser.role === 'admin' ? 'مدیر ارشد (Admin)' : currentUser.role === 'vip' ? 'کاربر ویژه (VIP)' : 'عضو سرور (Member)'}
              </span>
            </div>
          </div>

          {isSupabaseLoggedIn && onSignOut && (
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 pb-1 underline font-medium"
            >
              خروج از حساب
            </button>
          )}
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Nickname input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              نام نمایشی گیمری (Nickname)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Viper | RTX Player"
              className="w-full bg-[#111214] border border-[#35363c] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#76b900] transition"
            />
          </div>

          {/* Secure Role Notice */}
          <div className="p-3 bg-[#111214] border border-[#35363c] rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                رول و سطح دسترسی شما:
              </span>
              <span className="font-mono font-bold uppercase text-[#76b900]">
                {currentUser.role}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              🔒 <b>امنیت کامل:</b> کاربران عادی در سایت امکان تغییر دستی رول خود به VIP یا Admin را ندارند. اعطای مقام فقط توسط شما از طریق پنل یا دستور SQL در دیتابیس Supabase انجام می‌شود.
            </p>
          </div>

          {/* Gaming Avatar picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              انتخاب آواتار گیمینگ هوش مصنوعی (Gaming Avatar)
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {GAMING_AVATARS.map((av, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 p-1 bg-[#111214] transition ${
                    selectedAvatar === av
                      ? 'border-[#76b900] ring-2 ring-[#76b900]/40'
                      : 'border-[#35363c] hover:border-neutral-500'
                  }`}
                >
                  <img src={av} alt="Avatar option" className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#2b2d31] border-t border-[#35363c] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-xl transition"
          >
            انصراف
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-semibold bg-[#76b900] hover:bg-[#85d000] text-black rounded-xl shadow transition flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" /> ذخیره مشخصات
          </button>
        </div>
      </div>
    </div>
  );
};
