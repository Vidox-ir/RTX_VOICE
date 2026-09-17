import React from 'react';
import { VoiceRoom, AppUser } from '../types';
import { Crown, Star, Lock, Volume2, ShieldCheck, UserCheck, Mic, MicOff, Sparkles, Monitor } from 'lucide-react';

interface Props {
  rooms: VoiceRoom[];
  activeRoomId: string | null;
  currentUser: AppUser;
  participantsByRoom: Record<string, AppUser[]>;
  onJoinRoom: (room: VoiceRoom) => void;
  onLeaveRoom: () => void;
  onOpenUserProfile: () => void;
  onOpenRTXPanel: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  isSupabaseLive: boolean;
  onOpenSupabaseModal: () => void;
}

export const ChannelSidebar: React.FC<Props> = ({
  rooms,
  activeRoomId,
  currentUser,
  participantsByRoom,
  onJoinRoom,
  onLeaveRoom,
  onOpenUserProfile,
  onOpenRTXPanel,
  onToggleMute,
  onToggleDeafen,
  isSupabaseLive,
  onOpenSupabaseModal,
}) => {
  // Check permission helper
  const canAccessRoom = (room: VoiceRoom): { allowed: boolean; reason?: string } => {
    if (room.category === 'admin') {
      if (currentUser.role !== 'admin') {
        return { allowed: false, reason: 'فقط مخصوص رول ادمین 👑' };
      }
    }
    if (room.category === 'vip') {
      if (currentUser.role !== 'vip' && currentUser.role !== 'admin') {
        return { allowed: false, reason: 'مخصوص کاربران VIP و ادمین 💎' };
      }
    }

    // Capacity Check
    const inRoom = (participantsByRoom[room.id] || []).filter((u) => u.id !== currentUser.id);
    if (inRoom.length >= room.capacity && activeRoomId !== room.id) {
      return { allowed: false, reason: `اتاق تکمیل است (ظرفیت ${room.capacity} نفر)` };
    }

    return { allowed: true };
  };

  const adminRooms = rooms.filter((r) => r.category === 'admin');
  const vipRooms = rooms.filter((r) => r.category === 'vip');
  const publicRooms = rooms.filter((r) => r.category === 'public');

  return (
    <div className="w-72 bg-[#2b2d31] flex flex-col h-full border-l border-[#202225] select-none text-[#949ba4]">
      {/* Server Header */}
      <div className="h-14 px-4 border-b border-[#202225] flex items-center justify-between shadow-sm bg-[#2b2d31]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#76b900] to-emerald-700 flex items-center justify-center text-black font-black text-xs shadow-[0_0_10px_rgba(118,185,0,0.3)]">
            RTX
          </div>
          <div>
            <h2 className="text-white font-black text-sm tracking-wide flex items-center gap-1">
              RTX_VOICE
            </h2>
            <div className="text-[10px] text-neutral-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#76b900] animate-pulse" />
              ۱۰ اتاق صوتی فعال
            </div>
          </div>
        </div>
      </div>

      {/* Voice Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Category: Admin Rooms (2 rooms) */}
        <div className="space-y-1">
          <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> کانال‌های ادمین (۲ روم)
            </span>
            <span className="text-[10px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">
              Admin Only
            </span>
          </div>

          {adminRooms.map((room) => {
            const access = canAccessRoom(room);
            const isCurrent = activeRoomId === room.id;
            const participants = participantsByRoom[room.id] || [];

            return (
              <div key={room.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (isCurrent) {
                      onLeaveRoom();
                    } else if (access.allowed) {
                      onJoinRoom(room);
                    }
                  }}
                  disabled={!access.allowed && !isCurrent}
                  title={!access.allowed ? access.reason : room.topic}
                  className={`w-full group px-2.5 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition text-right ${
                    isCurrent
                      ? 'bg-[#35373c] text-white font-bold'
                      : access.allowed
                      ? 'hover:bg-[#35373c]/60 text-neutral-300 hover:text-white'
                      : 'opacity-50 cursor-not-allowed text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Volume2 className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#76b900]' : 'text-neutral-400'}`} />
                    <span className="truncate">{room.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!access.allowed && <Lock className="w-3.5 h-3.5 text-amber-500/80" />}
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                        participants.length >= room.capacity
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-[#1e1f22] text-neutral-400'
                      }`}
                    >
                      {participants.length}/{room.capacity}
                    </span>
                  </div>
                </button>

                {/* User List inside room */}
                {participants.length > 0 && (
                  <div className="pr-6 pl-2 py-1 space-y-1">
                    {participants.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] ${
                          user.isSpeaking ? 'bg-[#76b900]/10 text-white' : 'text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className={`w-5 h-5 rounded-full object-cover ${
                                user.isSpeaking ? 'ring-2 ring-[#76b900]' : ''
                              }`}
                            />
                            {user.isSpeaking && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#76b900] animate-ping" />
                            )}
                          </div>
                          <span className="truncate">{user.name}</span>
                          {user.role === 'admin' && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 text-neutral-500">
                          {user.rtxVoiceActive && (
                            <span className="text-[9px] bg-[#76b900]/20 text-[#76b900] px-1 rounded font-mono">
                              RTX
                            </span>
                          )}
                          {user.isMuted ? (
                            <MicOff className="w-3 h-3 text-rose-400" />
                          ) : (
                            user.isSpeaking && <Mic className="w-3 h-3 text-[#76b900]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Category: VIP Rooms (3 rooms) */}
        <div className="space-y-1">
          <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-purple-400/90 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-purple-400" /> کانال‌های ویژه VIP (۳ روم)
            </span>
            <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
              VIP & Admin
            </span>
          </div>

          {vipRooms.map((room) => {
            const access = canAccessRoom(room);
            const isCurrent = activeRoomId === room.id;
            const participants = participantsByRoom[room.id] || [];

            return (
              <div key={room.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (isCurrent) {
                      onLeaveRoom();
                    } else if (access.allowed) {
                      onJoinRoom(room);
                    }
                  }}
                  disabled={!access.allowed && !isCurrent}
                  title={!access.allowed ? access.reason : room.topic}
                  className={`w-full group px-2.5 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition text-right ${
                    isCurrent
                      ? 'bg-[#35373c] text-white font-bold'
                      : access.allowed
                      ? 'hover:bg-[#35373c]/60 text-neutral-300 hover:text-white'
                      : 'opacity-50 cursor-not-allowed text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Volume2 className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-purple-400' : 'text-neutral-400'}`} />
                    <span className="truncate">{room.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!access.allowed && <Lock className="w-3.5 h-3.5 text-purple-400/80" />}
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                        participants.length >= room.capacity
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-[#1e1f22] text-neutral-400'
                      }`}
                    >
                      {participants.length}/{room.capacity}
                    </span>
                  </div>
                </button>

                {/* User List inside room */}
                {participants.length > 0 && (
                  <div className="pr-6 pl-2 py-1 space-y-1">
                    {participants.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] ${
                          user.isSpeaking ? 'bg-purple-500/10 text-white' : 'text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className={`w-5 h-5 rounded-full object-cover ${
                                user.isSpeaking ? 'ring-2 ring-purple-400' : ''
                              }`}
                            />
                          </div>
                          <span className="truncate">{user.name}</span>
                          {user.role === 'vip' && <Star className="w-3 h-3 text-purple-400 shrink-0" />}
                          {user.role === 'admin' && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 text-neutral-500">
                          {user.rtxVoiceActive && (
                            <span className="text-[9px] bg-[#76b900]/20 text-[#76b900] px-1 rounded font-mono">
                              RTX
                            </span>
                          )}
                          {user.isMuted ? (
                            <MicOff className="w-3 h-3 text-rose-400" />
                          ) : (
                            user.isSpeaking && <Mic className="w-3 h-3 text-purple-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Category: Public Rooms (5 rooms, exactly 4 capacity) */}
        <div className="space-y-1">
          <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> کانال‌های عمومی (۵ روم)
            </span>
            <span className="text-[10px] bg-emerald-400/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/20">
              ظرفیت: ۴ نفر
            </span>
          </div>

          {publicRooms.map((room) => {
            const access = canAccessRoom(room);
            const isCurrent = activeRoomId === room.id;
            const participants = participantsByRoom[room.id] || [];

            return (
              <div key={room.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (isCurrent) {
                      onLeaveRoom();
                    } else if (access.allowed) {
                      onJoinRoom(room);
                    }
                  }}
                  disabled={!access.allowed && !isCurrent}
                  title={!access.allowed ? access.reason : room.topic}
                  className={`w-full group px-2.5 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition text-right ${
                    isCurrent
                      ? 'bg-[#35373c] text-white font-bold'
                      : access.allowed
                      ? 'hover:bg-[#35373c]/60 text-neutral-300 hover:text-white'
                      : 'opacity-50 cursor-not-allowed text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Volume2 className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-emerald-400' : 'text-neutral-400'}`} />
                    <span className="truncate">{room.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                        participants.length >= room.capacity
                          ? 'bg-rose-500/20 text-rose-300 font-bold'
                          : 'bg-[#1e1f22] text-neutral-400'
                      }`}
                    >
                      {participants.length}/{room.capacity}
                    </span>
                  </div>
                </button>

                {/* User List inside room */}
                {participants.length > 0 && (
                  <div className="pr-6 pl-2 py-1 space-y-1">
                    {participants.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] ${
                          user.isSpeaking ? 'bg-emerald-500/10 text-white' : 'text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className={`w-5 h-5 rounded-full object-cover ${
                              user.isSpeaking ? 'ring-2 ring-emerald-400' : ''
                            }`}
                          />
                          <span className="truncate">{user.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-neutral-500">
                          {user.rtxVoiceActive && (
                            <span className="text-[9px] bg-[#76b900]/20 text-[#76b900] px-1 rounded font-mono">
                              RTX
                            </span>
                          )}
                          {user.isMuted ? (
                            <MicOff className="w-3 h-3 text-rose-400" />
                          ) : (
                            user.isSpeaking && <Mic className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice Connected Bar if in a room */}
      {activeRoomId && (
        <div className="p-2.5 bg-[#1e1f22] border-t border-[#202225] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#23a55a] truncate">اتصال صوتی برقرار است</div>
              <div className="text-[10px] text-neutral-400 truncate">RTC 48kHz HD Audio</div>
            </div>
          </div>
          <button
            onClick={onLeaveRoom}
            className="px-2.5 py-1 text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md transition font-medium"
          >
            قطع تماس
          </button>
        </div>
      )}

      {/* User Bar (Discord style bottom bar) */}
      <div className="h-14 px-2 bg-[#232428] border-t border-[#202225] flex items-center justify-between">
        {/* User Card */}
        <button
          onClick={onOpenUserProfile}
          className="flex items-center gap-2 p-1 rounded-md hover:bg-[#35373c] transition min-w-0 text-right flex-1"
          title="تنظیمات پروفایل کاربری"
        >
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a55a] rounded-full border-2 border-[#232428]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-bold truncate flex items-center gap-1">
              {currentUser.name}
              {currentUser.role === 'admin' && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              {currentUser.role === 'vip' && <Star className="w-3 h-3 text-purple-400 shrink-0" />}
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {currentUser.role === 'admin' ? 'ادمین کل' : currentUser.role === 'vip' ? 'کاربر ویژه' : 'کاربر عادی'}
            </div>
          </div>
        </button>

        {/* Action icons: Mute, Deafen, RTX Control */}
        <div className="flex items-center gap-0.5">
          {/* RTX Voice Button */}
          <button
            onClick={onOpenRTXPanel}
            title={`تنظیمات RTX Voice (${currentUser.rtxVoiceActive ? 'فعال' : 'غیرفعال'})`}
            className={`p-2 rounded-md transition ${
              currentUser.rtxVoiceActive
                ? 'text-[#76b900] hover:bg-[#76b900]/20 bg-[#76b900]/10'
                : 'text-neutral-400 hover:text-white hover:bg-[#35373c]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Mute Mic */}
          <button
            onClick={onToggleMute}
            title={currentUser.isMuted ? 'وصل کردن میکروفون' : 'قطع میکروفون (Mute)'}
            className={`p-2 rounded-md transition ${
              currentUser.isMuted
                ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-[#35373c]'
            }`}
          >
            {currentUser.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Deafen */}
          <button
            onClick={onToggleDeafen}
            title={currentUser.isDeafened ? 'وصل کردن صدا' : 'قطع صدای سرور (Deafen)'}
            className={`p-2 rounded-md transition ${
              currentUser.isDeafened
                ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-[#35373c]'
            }`}
          >
            <Volume2 className={`w-4 h-4 ${currentUser.isDeafened ? 'text-rose-500' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
