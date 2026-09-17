export type UserRole = 'admin' | 'vip' | 'member';

export interface AppUser {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  rtxVoiceActive: boolean;
  rtxNoiseSuppression: number; // 0 to 100%
  rtxRoomEchoRemoval: boolean;
  rtxVoiceBassBoost: boolean;
  isSpeaking?: boolean;
  speakingVolume?: number; // 0 to 1
  peerId?: string;
}

export type RoomCategory = 'admin' | 'vip' | 'public';

export interface VoiceRoom {
  id: string;
  name: string;
  category: RoomCategory;
  capacity: number; // e.g. 4 for public, 10 for VIP, 20 for Admin
  topic: string;
  icon?: string;
  bitrateKbps: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userAvatar: string;
  content: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  isSystem?: boolean;
}

export interface SoundpadItem {
  id: string;
  name: string;
  emoji: string;
  freq: number;
  type: OscillatorType;
  duration: number;
}
