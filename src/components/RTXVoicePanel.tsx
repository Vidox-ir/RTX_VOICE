import React from 'react';
import { Sliders, Sparkles, Volume2, ShieldCheck, Activity, X } from 'lucide-react';
import { AppUser } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onUpdateSettings: (settings: Partial<AppUser>) => void;
  speakingVolume: number;
}

export const RTXVoicePanel: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateSettings,
  speakingVolume,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1e1f22] border border-[#35363c] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header with RTX branding styling */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#111214] via-[#1a2318] to-[#111214] border-b border-[#35363c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#76b900]/20 text-[#76b900] border border-[#76b900]/40 flex items-center justify-center font-black tracking-tighter text-sm shadow-[0_0_15px_rgba(118,185,0,0.3)]">
              RTX
            </div>
            <div>
              <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                NVIDIA RTX VOICE DSP Engine
                <span className="text-[10px] uppercase font-bold tracking-widest bg-[#76b900] text-black px-2 py-0.5 rounded">
                  AI Active
                </span>
              </h3>
              <p className="text-xs text-neutral-400">فناوری حذف هوشمند نویز پس‌زمینه و ارتقای شفافیت صدای میکروفون</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#35363c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Master Switch */}
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#35363c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  currentUser.rtxVoiceActive ? 'bg-[#76b900]/20 text-[#76b900]' : 'bg-[#1e1f22] text-neutral-500'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">پردازشگر RTX Voice</h4>
                <p className="text-xs text-neutral-400">فعال‌سازی هوش مصنوعی پالایش فرکانسی و حذف هوای اتاق</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ rtxVoiceActive: !currentUser.rtxVoiceActive })}
              className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${
                currentUser.rtxVoiceActive ? 'bg-[#76b900]' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  currentUser.rtxVoiceActive ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Live Mic VU Meter & Visualizer */}
          <div className="p-4 rounded-xl bg-[#111214] border border-[#2b2d31] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#76b900]" /> مانیتور زنده ورودی صدا (VU Meter)
              </span>
              <span className="text-[#76b900] font-mono font-bold">
                {Math.round(speakingVolume * 100)}%
              </span>
            </div>
            <div className="h-3 w-full bg-[#2b2d31] rounded-full overflow-hidden p-0.5 flex gap-1">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-[#76b900] to-yellow-400 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, speakingVolume * 120)}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-500 text-left dir-ltr">
              Real-time Biquad Bandpass & Notch Filter active @ 48kHz
            </p>
          </div>

          {/* Noise Suppression Slider */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#76b900]" />
                شدت حذف نویز (Noise Suppression)
              </label>
              <span className="text-xs font-bold text-white bg-[#2b2d31] px-2 py-0.5 rounded-md font-mono">
                {currentUser.rtxNoiseSuppression}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={!currentUser.rtxVoiceActive}
              value={currentUser.rtxNoiseSuppression}
              onChange={(e) => onUpdateSettings({ rtxNoiseSuppression: Number(e.target.value) })}
              className="w-full accent-[#76b900] cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-medium">
              <span>خاموش (۰٪)</span>
              <span>متعادل (۵۰٪) - مناسب کیبورد مکانیکی</span>
              <span>حداکثر (۱۰۰٪) - استودیو</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {/* Echo Removal */}
            <div className="p-3 rounded-xl bg-[#2b2d31]/70 border border-[#35363c] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#76b900]" />
                <div>
                  <div className="text-xs font-bold text-white">حذف اکوی اتاق (Acoustic Echo Removal)</div>
                  <div className="text-[11px] text-neutral-400">جلوگیری از فیدبک صدای اسپیکر در میکروفون</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentUser.rtxRoomEchoRemoval}
                disabled={!currentUser.rtxVoiceActive}
                onChange={(e) => onUpdateSettings({ rtxRoomEchoRemoval: e.target.checked })}
                className="w-4 h-4 accent-[#76b900] rounded cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Bass Boost */}
            <div className="p-3 rounded-xl bg-[#2b2d31]/70 border border-[#35363c] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#76b900]" />
                <div>
                  <div className="text-xs font-bold text-white">تقویت بم و لحن گویندگی (Radio Warmth Boost)</div>
                  <div className="text-[11px] text-neutral-400">افزایش گرمای صدا و شبیه‌سازی میکروفون برودکست</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentUser.rtxVoiceBassBoost}
                disabled={!currentUser.rtxVoiceActive}
                onChange={(e) => onUpdateSettings({ rtxVoiceBassBoost: e.target.checked })}
                className="w-4 h-4 accent-[#76b900] rounded cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#2b2d31] border-t border-[#35363c] flex items-center justify-between">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#76b900] animate-pulse" />
            RTX DSP Core: Ready
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-semibold bg-[#76b900] hover:bg-[#85d000] text-black rounded-lg font-mono transition shadow"
          >
            تأیید و ذخیره
          </button>
        </div>
      </div>
    </div>
  );
};
