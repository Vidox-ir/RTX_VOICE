import { VoiceRoom } from './types';

// Exactly 10 Voice Rooms requested:
// 2 Admin rooms (Admins only)
// 3 VIP rooms (VIPs & Admins only)
// 5 Public rooms with strictly 4-person capacity limit
export const VOICE_ROOMS: VoiceRoom[] = [
  // --- ADMIN ROOMS (2) ---
  {
    id: 'room-admin-1',
    name: '👑 اتاق مدیریت کل (Command Center)',
    category: 'admin',
    capacity: 10,
    topic: 'اتاق اختصاصی هماهنگی ادمین‌ها و مدیریت سرور',
    bitrateKbps: 384,
  },
  {
    id: 'room-admin-2',
    name: '🛡️ اتاق امنیت و رسیدگی (Security & Staff)',
    category: 'admin',
    capacity: 10,
    topic: 'بررسی گزارشات، لاگ‌ها و وضعیت اعضا',
    bitrateKbps: 384,
  },

  // --- VIP ROOMS (3) ---
  {
    id: 'room-vip-1',
    name: '💎 لاونج طلایی VIP Lounge #1',
    category: 'vip',
    capacity: 8,
    topic: 'کیفیت صدای اختصاصی اولترا ۳۲۰ کیلوبیت و اولویت بالا',
    bitrateKbps: 320,
  },
  {
    id: 'room-vip-2',
    name: '✨ روم استریم و گیمینگ VIP Gaming',
    category: 'vip',
    capacity: 8,
    topic: 'مخصوص گیمرها و استریمرهای ویژه سرور',
    bitrateKbps: 320,
  },
  {
    id: 'room-vip-3',
    name: '🔥 پاتوق ویژه VIP Private Hub',
    category: 'vip',
    capacity: 8,
    topic: 'دورهمی صمیمی کاربران اشتراک ویژه',
    bitrateKbps: 320,
  },

  // --- PUBLIC ROOMS (5 rooms, each strictly max 4 people capacity) ---
  {
    id: 'room-public-1',
    name: '🟢 پاتوق عمومی ۱ (Squad Alpha)',
    category: 'public',
    capacity: 4,
    topic: 'گپ و گفت صوتی عمومی - ظرفیت حداکثر ۴ نفر',
    bitrateKbps: 128,
  },
  {
    id: 'room-public-2',
    name: '🟢 پاتوق عمومی ۲ (Squad Bravo)',
    category: 'public',
    capacity: 4,
    topic: 'گپ و گفت صوتی عمومی - ظرفیت حداکثر ۴ نفر',
    bitrateKbps: 128,
  },
  {
    id: 'room-public-3',
    name: '🟢 پاتوق عمومی ۳ (Squad Charlie)',
    category: 'public',
    capacity: 4,
    topic: 'گپ و گفت صوتی عمومی - ظرفیت حداکثر ۴ نفر',
    bitrateKbps: 128,
  },
  {
    id: 'room-public-4',
    name: '🟢 پاتوق عمومی ۴ (Squad Delta)',
    category: 'public',
    capacity: 4,
    topic: 'گپ و گفت صوتی عمومی - ظرفیت حداکثر ۴ نفر',
    bitrateKbps: 128,
  },
  {
    id: 'room-public-5',
    name: '🟢 پاتوق عمومی ۵ (Squad Echo)',
    category: 'public',
    capacity: 4,
    topic: 'گپ و گفت صوتی عمومی - ظرفیت حداکثر ۴ نفر',
    bitrateKbps: 128,
  },
];
