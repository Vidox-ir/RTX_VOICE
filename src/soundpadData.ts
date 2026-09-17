import { SoundpadItem } from './types';

export const DEFAULT_SOUNDPAD_ITEMS: SoundpadItem[] = [
  { id: 's1', name: 'GG Victory', emoji: '🏆', freq: 587, type: 'triangle', duration: 0.45 },
  { id: 's2', name: 'Air Horn High', emoji: '🎺', freq: 880, type: 'sawtooth', duration: 0.35 },
  { id: 's3', name: 'Bass Drop', emoji: '💣', freq: 110, type: 'sine', duration: 0.6 },
  { id: 's4', name: 'Level Up', emoji: '⭐', freq: 659, type: 'triangle', duration: 0.4 },
  { id: 's5', name: 'Ping Mention', emoji: '🔔', freq: 987, type: 'sine', duration: 0.25 },
  { id: 's6', name: 'Bruh Moment', emoji: '💀', freq: 146, type: 'sawtooth', duration: 0.5 },
];
