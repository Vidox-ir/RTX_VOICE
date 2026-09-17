import React from 'react';
import { VoiceRoom, AppUser } from '../types';
import { Mic, MicOff, Monitor, Sparkles, PhoneOff, Users, Crown, Star, Activity, Volume2 } from 'lucide-react';

interface Props {
  room: VoiceRoom;
  participants: AppUser[];
  currentUser: AppUser;
  onLeaveRoom: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onOpenRTXPanel: () => void;
  onOpenSoundpad: () => void;
  speakingVolume: number;
}

export const ActiveVoiceStage: React.FC<Props> = ({
  room,
  participants,
  currentUser,
  onLeaveRoom,
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onOpenRTXPanel,
  onOpenSoundpad,
  speakingVolume,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#313338] overflow-hidden">
      {/* Top Bar for Room Info */}
      <div className="h-14 px-6 border-b border-[#202225] flex items-center justify-between bg-[#313338]">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              room.category === 'admin'
                ? 'bg-amber-400'
                : room.category === 'vip'
                ? 'bg-purple-400'
                : 'bg-emerald-400'
            }`}
          />
          <div>
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              {room.name}
              {room.category === 'admin' && (
                <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono">ADMIN</span>
              )}
              {room.category === 'vip' && (
                <span className="text-xs bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded font-mono">VIP</span>
              )}
              {room.category === 'public' && (
                <span className="text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  ظرفیت ۴ نفر
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400">{room.topic} • نرخ بیت: {room.bitrateKbps}kbps</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* RTX Indicator */}
          <button
            onClick={onOpenRTXPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#76b900]/10 hover:bg-[#76b900]/20 border border-[#76b900]/30 text-[#76b900] text-xs font-mono font-bold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            RTX AI DSP: {currentUser.rtxVoiceActive ? `${currentUser.rtxNoiseSuppression}%` : 'OFF'}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2b2d31] text-xs text-neutral-300 font-mono">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            {participants.length} / {room.capacity}
          </div>
        </div>
      </div>

      {/* Grid of Voice Participants (Discord Tile Style) */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        <div
          className={`w-full max-w-5xl grid gap-4 ${
            participants.length === 1
              ? 'grid-cols-1 max-w-md'
              : participants.length === 2
              ? 'grid-cols-2 max-w-2xl'
              : participants.length <= 4
              ? 'grid-cols-2 max-w-3xl'
              : 'grid-cols-3'
          }`}
        >
          {participants.map((user) => {
            const isMe = user.id === currentUser.id;
            const speaking = isMe ? currentUser.isSpeaking : user.isSpeaking;

            return (
              <div
                key={user.id}
                className={`relative aspect-video rounded-2xl bg-[#2b2d31] border-2 transition-all duration-150 flex flex-col items-center justify-center overflow-hidden shadow-lg group ${
                  speaking
                    ? 'border-[#23a55a] shadow-[0_0_20px_rgba(35,165,90,0.3)]'
                    : 'border-[#1e1f22]'
                }`}
              >
                {/* Background Ambient Glow */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-10 blur-xl scale-110"
                  style={{ backgroundImage: `url(${user.avatar})` }}
                />

                {/* Avatar with Speaking Halo */}
                <div className="relative z-10">
                  <div
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 transition-all duration-100 ${
                      speaking
                        ? 'border-[#23a55a] scale-105'
                        : 'border-[#1e1f22]'
                    }`}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* RTX Voice Active Badge on Tile */}
                  {user.rtxVoiceActive && (
                    <div
                      title="میکروفون مجهز به RTX Voice AI"
                      className="absolute -bottom-1 -right-1 bg-[#76b900] text-black text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> RTX
                    </div>
                  )}
                </div>

                {/* Name and State Pill in bottom */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium truncate max-w-[80%]">
                    <span className="truncate">{user.name}</span>
                    {isMe && <span className="text-[10px] text-neutral-400">(شما)</span>}
                    {user.role === 'admin' && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                    {user.role === 'vip' && <Star className="w-3 h-3 text-purple-400 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1">
                    {user.isMuted && (
                      <div className="p-1 rounded-md bg-rose-500/80 text-white">
                        <MicOff className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {user.isDeafened && (
                      <div className="p-1 rounded-md bg-rose-500/80 text-white">
                        <Volume2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Speaking Wave Animation overlay */}
                {speaking && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md bg-[#23a55a]/20 border border-[#23a55a]/40 text-[#23a55a] text-[11px] font-mono">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span>در حال صحبت</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Control Dock */}
      <div className="p-4 bg-[#2b2d31] border-t border-[#202225] flex items-center justify-center gap-3 select-none">
        {/* Mute Mic */}
        <button
          onClick={onToggleMute}
          className={`p-3.5 rounded-2xl transition flex items-center gap-2 font-medium text-xs shadow ${
            currentUser.isMuted
              ? 'bg-rose-500 hover:bg-rose-600 text-white'
              : 'bg-[#35373c] hover:bg-[#404249] text-white'
          }`}
        >
          {currentUser.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#23a55a]" />}
          <span>{currentUser.isMuted ? 'میکروفون بسته' : 'میکروفون باز'}</span>
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3.5 rounded-2xl transition flex items-center gap-2 font-medium text-xs shadow ${
            currentUser.isScreenSharing
              ? 'bg-[#23a55a] hover:bg-[#208f4e] text-white'
              : 'bg-[#35373c] hover:bg-[#404249] text-white'
          }`}
        >
          <Monitor className="w-5 h-5" />
          <span>{currentUser.isScreenSharing ? 'اشتراک‌گذاری فعال' : 'اشتراک صفحه'}</span>
        </button>

        {/* Soundpad Launcher */}
        <button
          onClick={onOpenSoundpad}
          className="p-3.5 rounded-2xl bg-[#35373c] hover:bg-[#404249] text-white transition flex items-center gap-2 font-medium text-xs shadow"
        >
          <span className="text-base">🎵</span>
          <span>ساندپد SFX</span>
        </button>

        {/* RTX DSP Settings */}
        <button
          onClick={onOpenRTXPanel}
          className="p-3.5 rounded-2xl bg-[#76b900]/20 hover:bg-[#76b900]/30 border border-[#76b900]/40 text-[#76b900] transition flex items-center gap-2 font-bold text-xs shadow"
        >
          <Sparkles className="w-5 h-5" />
          <span>تنظیمات RTX Voice</span>
        </button>

        {/* Disconnect Red Button */}
        <button
          onClick={onLeaveRoom}
          className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 font-bold text-xs shadow active:scale-95"
        >
          <PhoneOff className="w-5 h-5" />
          <span>قطع تماس</span>
        </button>
      </div>
    </div>
  );
};
