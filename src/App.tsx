import React, { useState, useEffect, useRef } from 'react';
import { VOICE_ROOMS } from './roomsConfig';
import { VoiceRoom, AppUser, ChatMessage, SoundpadItem } from './types';
import { DEFAULT_SOUNDPAD_ITEMS } from './soundpadData';
import { RTXAudioEngine } from './rtxAudio';
import { WebRTCVoiceRoomManager } from './webrtcVoice';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { GAMING_AVATARS } from './avatars';

import { ChannelSidebar } from './components/ChannelSidebar';
import { ActiveVoiceStage } from './components/ActiveVoiceStage';
import { RoomChat } from './components/RoomChat';
import { RTXVoicePanel } from './components/RTXVoicePanel';
import { UserProfileModal } from './components/UserProfileModal';
import { SoundpadModal } from './components/SoundpadModal';
import { SupabaseModal } from './components/SupabaseModal';
import { AuthModal } from './components/AuthModal';

import { Volume2, Sparkles, Crown, Star, Users, Database, Headset, LogIn, Radio } from 'lucide-react';

export default function App() {
  // Current user state (Default is Member, never Admin/VIP without Supabase grant)
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('rtx_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: 'بازیکن RTX',
      avatar: GAMING_AVATARS[0],
      role: 'member', // Strictly member by default.
      isMuted: false,
      isDeafened: false,
      isScreenSharing: false,
      rtxVoiceActive: true,
      rtxNoiseSuppression: 80,
      rtxRoomEchoRemoval: true,
      rtxVoiceBassBoost: true,
      isSpeaking: false,
      speakingVolume: 0,
    };
  });

  // Active voice room
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Participants by room (real users only!)
  const [participantsByRoom, setParticipantsByRoom] = useState<Record<string, AppUser[]>>({});

  // Messages per room
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({
    global: [
      {
        id: 'm1',
        roomId: 'global',
        userId: 'system',
        userName: 'سرور صوتی RTX',
        userRole: 'admin',
        userAvatar: GAMING_AVATARS[1],
        content: 'به سرور رسمی RTX_VOICE خوش آمدید! 🎉 انتقال صدای واقعی P2P بدون افت کیفیت با فیلتر هوش مصنوعی RTX فعال است.',
        timestamp: Date.now() - 3600000,
        reactions: { '🎙️': ['system'] },
      },
    ],
  });

  // Audio Engine ref (RTX DSP Filter)
  const audioEngineRef = useRef<RTXAudioEngine | null>(null);
  // WebRTC Mesh Manager (Sends processed audio to everyone else)
  const webrtcVoiceRef = useRef<WebRTCVoiceRoomManager | null>(null);

  const [speakingVolume, setSpeakingVolume] = useState<number>(0);

  // Modals state
  const [isRTXPanelOpen, setIsRTXPanelOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSoundpadOpen, setIsSoundpadOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(isSupabaseConfigured());
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | null>(null);

  // Save current user to local storage
  useEffect(() => {
    localStorage.setItem('rtx_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Check Supabase Auth Session and fetch real role from `rtx_profiles`
  const refreshUserFromSupabase = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseUserEmail(session.user.email || null);

        const { data: profile, error } = await supabase
          .from('rtx_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile && !error) {
          setCurrentUser((prev) => ({
            ...prev,
            id: profile.id,
            name: profile.username || prev.name,
            avatar: profile.avatar_url || prev.avatar,
            role: (profile.role as AppUser['role']) || 'member',
          }));
        } else {
          const meta = session.user.user_metadata;
          setCurrentUser((prev) => ({
            ...prev,
            id: session.user.id,
            name: meta?.username || session.user.email?.split('@')[0] || prev.name,
            avatar: meta?.avatar_url || prev.avatar,
            role: 'member',
          }));
        }
      } else {
        setSupabaseUserEmail(null);
      }
    } catch (e) {
      console.warn('Failed to get Supabase session:', e);
    }
  };

  useEffect(() => {
    refreshUserFromSupabase();
  }, [isSupabaseConnected]);

  // Real-time Voice Presence Sync via Supabase Table
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchPresence = async () => {
      const { data } = await supabase.from('rtx_voice_presence').select('*');
      if (data) {
        const grouped: Record<string, AppUser[]> = {};
        data.forEach((row) => {
          const rId = row.room_id;
          if (!grouped[rId]) grouped[rId] = [];

          const existingMe = row.user_id === currentUser.id;
          grouped[rId].push({
            id: row.user_id,
            name: existingMe ? currentUser.name : row.user_name,
            avatar: existingMe ? currentUser.avatar : (row.user_avatar || GAMING_AVATARS[0]),
            role: row.user_role || 'member',
            isMuted: existingMe ? currentUser.isMuted : Boolean(row.is_muted),
            isDeafened: existingMe ? currentUser.isDeafened : false,
            isScreenSharing: existingMe ? currentUser.isScreenSharing : false,
            rtxVoiceActive: Boolean(row.rtx_active),
            rtxNoiseSuppression: 80,
            rtxRoomEchoRemoval: true,
            rtxVoiceBassBoost: true,
            isSpeaking: existingMe ? currentUser.isSpeaking : Boolean(row.is_speaking),
            speakingVolume: 0,
          });

          // Connect to peer if in same room and has peer_id
          if (activeRoomId && rId === activeRoomId && !existingMe && row.peer_id && webrtcVoiceRef.current) {
            webrtcVoiceRef.current.callPeer(row.peer_id);
          }
        });
        setParticipantsByRoom(grouped);
      }
    };

    fetchPresence();

    const channel = supabase
      .channel('rtx-presence-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rtx_voice_presence' }, () => {
        fetchPresence();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConnected, activeRoomId, currentUser.id]);

  // Supabase real-time messages listener
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Fetch recent messages
    supabase
      .from('rtx_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(60)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setMessagesByRoom((prev) => {
            const next = { ...prev };
            data.forEach((row: { id: string; room_id: string; user_id: string; user_name: string; user_role: string; user_avatar: string; content: string; created_at: string; reactions: Record<string, string[]> }) => {
              const rId = row.room_id || 'global';
              if (!next[rId]) next[rId] = [];
              if (!next[rId].some((m) => m.id === row.id)) {
                next[rId].push({
                  id: row.id,
                  roomId: rId,
                  userId: row.user_id,
                  userName: row.user_name,
                  userRole: (row.user_role as AppUser['role']) || 'member',
                  userAvatar: row.user_avatar,
                  content: row.content,
                  timestamp: new Date(row.created_at).getTime(),
                  reactions: row.reactions || {},
                });
              }
            });
            return next;
          });
        }
      });

    // Realtime channel
    const channel = supabase
      .channel('rtx-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rtx_messages' },
        (payload) => {
          const row = payload.new as { id: string; room_id: string; user_id: string; user_name: string; user_role: string; user_avatar: string; content: string; created_at: string; reactions: Record<string, string[]> };
          if (!row || !row.id) return;
          const rId = row.room_id || 'global';

          setMessagesByRoom((prev) => {
            const list = prev[rId] || [];
            if (list.some((m) => m.id === row.id)) return prev;
            return {
              ...prev,
              [rId]: [
                ...list,
                {
                  id: row.id,
                  roomId: rId,
                  userId: row.user_id,
                  userName: row.user_name,
                  userRole: (row.user_role as AppUser['role']) || 'member',
                  userAvatar: row.user_avatar,
                  content: row.content,
                  timestamp: new Date(row.created_at).getTime(),
                  reactions: row.reactions || {},
                },
              ],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConnected]);

  // Audio Engine & WebRTC Instances
  useEffect(() => {
    audioEngineRef.current = new RTXAudioEngine();
    webrtcVoiceRef.current = new WebRTCVoiceRoomManager();

    return () => {
      audioEngineRef.current?.stop();
      webrtcVoiceRef.current?.leaveVoice();
    };
  }, []);

  // Update audio DSP when RTX params change
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.updateParameters({
        noiseSuppression: currentUser.rtxVoiceActive ? currentUser.rtxNoiseSuppression : 0,
        roomEchoRemoval: currentUser.rtxVoiceActive ? currentUser.rtxRoomEchoRemoval : false,
        bassBoost: currentUser.rtxVoiceActive ? currentUser.rtxVoiceBassBoost : false,
        isMuted: currentUser.isMuted,
      });
    }
  }, [
    currentUser.rtxVoiceActive,
    currentUser.rtxNoiseSuppression,
    currentUser.rtxRoomEchoRemoval,
    currentUser.rtxVoiceBassBoost,
    currentUser.isMuted,
  ]);

  // Sync presence to Supabase
  const syncPresence = async (roomId: string | null, peerId?: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      if (!roomId) {
        await supabase.from('rtx_voice_presence').delete().eq('user_id', currentUser.id);
      } else {
        await supabase.from('rtx_voice_presence').upsert({
          user_id: currentUser.id,
          room_id: roomId,
          user_name: currentUser.name,
          user_avatar: currentUser.avatar,
          user_role: currentUser.role,
          peer_id: peerId || `rtx_${roomId.replace(/[^a-zA-Z0-9_-]/g, '')}_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
          is_muted: currentUser.isMuted,
          is_speaking: currentUser.isSpeaking,
          rtx_active: currentUser.rtxVoiceActive,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Presence sync error:', e);
    }
  };

  // Connect to room
  const handleJoinRoom = async (room: VoiceRoom) => {
    const currentInRoom = (participantsByRoom[room.id] || []).filter((u) => u.id !== currentUser.id);
    if (currentInRoom.length >= room.capacity) {
      alert(`ظرفیت این اتاق تکمیل است (حداکثر ${room.capacity} نفر)`);
      return;
    }

    if (room.category === 'admin' && currentUser.role !== 'admin') {
      alert('⛔ دسترسی غیرمجاز: این اتاق صوتی فقط مخصوص ادمین‌های سرور است.');
      return;
    }
    if (room.category === 'vip' && currentUser.role !== 'vip' && currentUser.role !== 'admin') {
      alert('⛔ دسترسی غیرمجاز: این اتاق مخصوص کاربران دارای رول VIP یا Admin است.');
      return;
    }

    handleLeaveRoom();
    setActiveRoomId(room.id);

    setParticipantsByRoom((prev) => ({
      ...prev,
      [room.id]: [...(prev[room.id] || []).filter((u) => u.id !== currentUser.id), currentUser],
    }));

    // Start Audio Engine with mic
    try {
      if (audioEngineRef.current) {
        const stream = await audioEngineRef.current.startMicrophone({
          noiseSuppression: currentUser.rtxVoiceActive ? currentUser.rtxNoiseSuppression : 0,
          roomEchoRemoval: currentUser.rtxRoomEchoRemoval,
          bassBoost: currentUser.rtxVoiceBassBoost,
          onVolume: (vol, isSpeaking) => {
            setSpeakingVolume(vol);
            setCurrentUser((u) => ({
              ...u,
              speakingVolume: vol,
              isSpeaking: !u.isMuted && isSpeaking,
            }));
          },
        });

        // Broadcast real audio stream through WebRTC to other real users
        if (webrtcVoiceRef.current && stream) {
          const peerId = await webrtcVoiceRef.current.joinVoice({
            userId: currentUser.id,
            roomId: room.id,
            localStream: stream,
            onUserSpeaking: (speakingUserId, isSpk) => {
              setParticipantsByRoom((prev) => {
                const list = prev[room.id] || [];
                return {
                  ...prev,
                  [room.id]: list.map((u) => (u.id === speakingUserId ? { ...u, isSpeaking: isSpk } : u)),
                };
              });
            },
          });
          syncPresence(room.id, peerId);
        }
      }
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      syncPresence(room.id);
    }
  };

  // Leave active room
  const handleLeaveRoom = () => {
    if (activeRoomId) {
      setParticipantsByRoom((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).filter((u) => u.id !== currentUser.id),
      }));
      syncPresence(null);
    }
    setActiveRoomId(null);
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
    }
    if (webrtcVoiceRef.current) {
      webrtcVoiceRef.current.leaveVoice();
    }
    setSpeakingVolume(0);
    setCurrentUser((u) => ({ ...u, isSpeaking: false, speakingVolume: 0 }));
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !currentUser.isMuted;
    setCurrentUser((u) => ({ ...u, isMuted: nextMuted, isSpeaking: !nextMuted ? u.isSpeaking : false }));
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    setCurrentUser((u) => ({
      ...u,
      isDeafened: !u.isDeafened,
      isMuted: !u.isDeafened ? true : u.isMuted,
    }));
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (!currentUser.isScreenSharing) {
      try {
        await navigator.mediaDevices.getDisplayMedia({ video: true });
        setCurrentUser((u) => ({ ...u, isScreenSharing: true }));
      } catch (e) {
        console.warn('Screen share canceled or error', e);
      }
    } else {
      setCurrentUser((u) => ({ ...u, isScreenSharing: false }));
    }
  };

  // Send message
  const handleSendMessage = (text: string) => {
    const targetRoomId = activeRoomId || 'global';
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      roomId: targetRoomId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      userAvatar: currentUser.avatar,
      content: text,
      timestamp: Date.now(),
      reactions: {},
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [targetRoomId]: [...(prev[targetRoomId] || []), newMsg],
    }));

    const supabase = getSupabase();
    if (supabase) {
      supabase
        .from('rtx_messages')
        .insert({
          id: newMsg.id,
          room_id: newMsg.roomId,
          user_id: newMsg.userId,
          user_name: newMsg.userName,
          user_role: newMsg.userRole,
          user_avatar: newMsg.userAvatar,
          content: newMsg.content,
          reactions: newMsg.reactions,
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase message insert error:', error.message);
        });
    }
  };

  // Add reaction
  const handleAddReaction = (messageId: string, emoji: string) => {
    const targetRoomId = activeRoomId || 'global';
    setMessagesByRoom((prev) => {
      const roomMsgs = prev[targetRoomId] || [];
      const updated = roomMsgs.map((m) => {
        if (m.id === messageId) {
          const currentReactions = { ...(m.reactions || {}) };
          const users = currentReactions[emoji] || [];
          if (users.includes(currentUser.id)) {
            currentReactions[emoji] = users.filter((id) => id !== currentUser.id);
            if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = [...users, currentUser.id];
          }
          return { ...m, reactions: currentReactions };
        }
        return m;
      });
      return { ...prev, [targetRoomId]: updated };
    });
  };

  const handleTriggerSoundpad = (item: SoundpadItem) => {
    handleSendMessage(`🔊 [Soundpad]: ${item.emoji} ${item.name}`);
  };

  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSupabaseUserEmail(null);
    setCurrentUser((prev) => ({
      ...prev,
      id: 'guest-' + Math.random().toString(36).substring(2, 9),
      name: 'بازیکن مهمان',
      role: 'member',
    }));
  };

  const activeRoom = VOICE_ROOMS.find((r) => r.id === activeRoomId) || null;
  const currentRoomMessages = messagesByRoom[activeRoomId || 'global'] || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22] text-[#dbdee1] font-sans antialiased dir-rtl select-none">
      {/* 1. Left Discord Server Rail */}
      <div className="w-18 bg-[#1e1f22] flex flex-col items-center py-3 gap-2 shrink-0 border-l border-[#202225]">
        <button
          onClick={() => handleLeaveRoom()}
          title="صفحه اصلی سرور RTX_VOICE"
          className="w-12 h-12 rounded-2xl bg-[#5865f2] hover:rounded-xl transition-all duration-200 flex items-center justify-center text-white shadow-md group relative"
        >
          <Headset className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
        </button>

        <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

        {/* RTX Voice Status button */}
        <button
          onClick={() => setIsRTXPanelOpen(true)}
          title="پنل تنظیمات شبیه‌ساز سخت‌افزاری RTX Voice AI"
          className={`w-12 h-12 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center font-black text-xs shadow-md border ${
            currentUser.rtxVoiceActive
              ? 'bg-[#1a2e12] border-[#76b900] text-[#76b900] hover:rounded-xl shadow-[0_0_12px_rgba(118,185,0,0.3)]'
              : 'bg-[#2b2d31] border-neutral-700 text-neutral-400 hover:rounded-xl'
          }`}
        >
          <span className="text-[10px] leading-tight">RTX</span>
          <span className="text-[8px] opacity-75">DSP</span>
        </button>

        {/* Soundpad button */}
        <button
          onClick={() => setIsSoundpadOpen(true)}
          title="ساندپد اختصاصی"
          className="w-12 h-12 rounded-2xl bg-[#2b2d31] hover:bg-[#35363c] hover:rounded-xl transition-all duration-200 flex items-center justify-center text-xl shadow"
        >
          🎵
        </button>

        {/* Realtime voice transmission indicator */}
        {activeRoomId && (
          <div
            title="انتقال صدای واقعی WebRTC متصل است"
            className="w-12 h-12 rounded-2xl bg-[#23a55a]/20 border border-[#23a55a]/40 text-[#23a55a] flex flex-col items-center justify-center animate-pulse"
          >
            <Radio className="w-4 h-4" />
            <span className="text-[7px] font-bold">LIVE</span>
          </div>
        )}

        {/* Login / Register with Email button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          title={supabaseUserEmail ? `وارد شده با: ${supabaseUserEmail}` : 'ورود / ثبت‌نام با ایمیل'}
          className={`w-12 h-12 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center shadow ${
            supabaseUserEmail
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-[#2b2d31] hover:bg-[#35363c] text-neutral-300'
          }`}
        >
          <LogIn className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-0.5">{supabaseUserEmail ? 'اکانت' : 'ورود'}</span>
        </button>

        {/* Supabase Database Connection */}
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          title="اتصال و بررسی دیتابیس Supabase"
          className={`w-12 h-12 rounded-2xl transition-all duration-200 flex items-center justify-center shadow mt-auto ${
            isSupabaseConnected
              ? 'bg-[#23a55a]/20 border border-[#23a55a]/40 text-[#23a55a]'
              : 'bg-[#2b2d31] text-neutral-400 hover:text-white'
          }`}
        >
          <Database className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Channel & Room Navigator Sidebar */}
      <ChannelSidebar
        rooms={VOICE_ROOMS}
        activeRoomId={activeRoomId}
        currentUser={currentUser}
        participantsByRoom={participantsByRoom}
        onJoinRoom={handleJoinRoom}
        onLeaveRoom={handleLeaveRoom}
        onOpenUserProfile={() => setIsUserProfileOpen(true)}
        onOpenRTXPanel={() => setIsRTXPanelOpen(true)}
        onToggleMute={handleToggleMute}
        onToggleDeafen={handleToggleDeafen}
        isSupabaseLive={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* 3. Center Main Stage */}
      {activeRoom ? (
        <ActiveVoiceStage
          room={activeRoom}
          participants={participantsByRoom[activeRoom.id] || []}
          currentUser={currentUser}
          onLeaveRoom={handleLeaveRoom}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onToggleScreenShare={handleToggleScreenShare}
          onOpenRTXPanel={() => setIsRTXPanelOpen(true)}
          onOpenSoundpad={() => setIsSoundpadOpen(true)}
          speakingVolume={speakingVolume}
        />
      ) : (
        <div className="flex-1 flex flex-col bg-[#313338] items-center justify-center p-8 text-center select-none overflow-y-auto">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#76b900]/10 border border-[#76b900]/30 text-[#76b900] text-xs font-mono font-bold tracking-wider">
              <Sparkles className="w-4 h-4" />
              RTX_VOICE REAL-TIME P2P
            </div>

            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              سرور صوتی زنده با فیلتر هوش مصنوعی RTX
            </h1>

            <p className="text-sm text-neutral-400 leading-relaxed">
              انتقال صدای واقعی بین کاربران به کمک WebRTC برقرار است؛ به طوری که هر صدایی با فیلتر بلادرنگ حذف نویز RTX پردازش شده و مستقیماً به گوش دیگران در همان روم می‌رسد.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
              <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <h3 className="text-white text-xs font-bold">۲ روم ادمین</h3>
                <p className="text-[11px] text-neutral-400">فقط کاربرانی با نقش admin مجاز به ورود هستند</p>
              </div>

              <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Star className="w-4 h-4" />
                </div>
                <h3 className="text-white text-xs font-bold">۳ روم VIP</h3>
                <p className="text-[11px] text-neutral-400">مخصوص کاربران دارای رول VIP و ادمین با کیفیت ۳۲۰kbps</p>
              </div>

              <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-white text-xs font-bold">۵ روم عمومی (۴ نفره)</h3>
                <p className="text-[11px] text-neutral-400">ظرفیت دقیق ۴ نفره بدون حضور هیچ کاربر فیک</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              {!supabaseUserEmail ? (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  ورود یا ثبت‌نام با ایمیل
                </button>
              ) : (
                <button
                  onClick={() => {
                    const firstPub = VOICE_ROOMS.find((r) => r.category === 'public');
                    if (firstPub) handleJoinRoom(firstPub);
                  }}
                  className="px-6 py-3 bg-[#23a55a] hover:bg-[#1f924f] text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  ورود به اتاق عمومی ۱
                </button>
              )}

              <button
                onClick={() => setIsRTXPanelOpen(true)}
                className="px-5 py-3 bg-[#76b900]/10 hover:bg-[#76b900]/20 border border-[#76b900]/40 text-[#76b900] rounded-xl font-bold text-sm transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                تنظیمات فیلتر صوتی RTX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Right Text Chat Channel */}
      <RoomChat
        currentRoom={activeRoom}
        messages={currentRoomMessages}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onAddReaction={handleAddReaction}
      />

      {/* Modals */}
      <RTXVoicePanel
        isOpen={isRTXPanelOpen}
        onClose={() => setIsRTXPanelOpen(false)}
        currentUser={currentUser}
        onUpdateSettings={(settings) => setCurrentUser((u) => ({ ...u, ...settings }))}
        speakingVolume={speakingVolume}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updated) => setCurrentUser((u) => ({ ...u, ...updated }))}
        onSignOut={handleSignOut}
        isSupabaseLoggedIn={Boolean(supabaseUserEmail)}
      />

      <SoundpadModal
        isOpen={isSoundpadOpen}
        onClose={() => setIsSoundpadOpen(false)}
        items={DEFAULT_SOUNDPAD_ITEMS}
        onTriggerSound={handleTriggerSoundpad}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSaved={() => {
          setIsSupabaseConnected(isSupabaseConfigured());
          refreshUserFromSupabase();
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsSupabaseConnected(isSupabaseConfigured());
          refreshUserFromSupabase();
        }}
        onOpenDbModal={() => {
          setIsAuthModalOpen(false);
          setIsSupabaseModalOpen(true);
        }}
      />
    </div>
  );
}
