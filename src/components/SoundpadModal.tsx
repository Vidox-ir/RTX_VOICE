import React from 'react';
import { SoundpadItem } from '../types';
import { RTXAudioEngine } from '../rtxAudio';
import { Volume2, Music, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: SoundpadItem[];
  onTriggerSound: (sound: SoundpadItem) => void;
}

export const SoundpadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  items,
  onTriggerSound,
}) => {
  if (!isOpen) return null;

  const handlePlay = (item: SoundpadItem) => {
    RTXAudioEngine.playSoundpad(item.freq, item.type, item.duration);
    onTriggerSound(item);
    if (item.name.includes('Victory') || item.name.includes('Level')) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1e1f22] border border-[#35363c] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2b2d31] border-b border-[#35363c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5865f2]/20 text-[#5865f2] flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">دیسکورد ساندپد (Soundpad)</h3>
              <p className="text-xs text-neutral-400">پخش افکت‌های صوتی ریل‌تایم با سنتز فرکانسی وب‌آدیو</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#35363c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sound Grid */}
        <div className="p-6 grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
          {items.map((sound) => (
            <button
              key={sound.id}
              onClick={() => handlePlay(sound)}
              className="p-3.5 bg-[#2b2d31] hover:bg-[#35363c] border border-[#35363c] hover:border-[#5865f2] rounded-xl flex items-center gap-3 transition-all active:scale-95 group text-right"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {sound.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-xs truncate group-hover:text-[#5865f2] transition-colors">
                  {sound.name}
                </div>
                <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                  <Volume2 className="w-3 h-3 text-[#76b900]" /> {sound.freq}Hz
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#35363c] text-center text-xs text-neutral-400">
          کلیک روی هر دکمه، صدای SFX را برای حاضرین چت و روم پخش می‌کند.
        </div>
      </div>
    </div>
  );
};
