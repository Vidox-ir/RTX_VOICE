import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AppUser, VoiceRoom } from '../types';
import { Send, Smile, Hash, Crown, Star, Sparkles, MessageSquare } from 'lucide-react';

interface Props {
  currentRoom: VoiceRoom | null;
  messages: ChatMessage[];
  currentUser: AppUser;
  onSendMessage: (text: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
}

const COMMON_EMOJIS = ['🔥', '❤️', '😂', '👑', '🚀', '💯'];

export const RoomChat: React.FC<Props> = ({
  currentRoom,
  messages,
  currentUser,
  onSendMessage,
  onAddReaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 lg:w-96 bg-[#2b2d31] flex flex-col h-full border-r border-[#202225] select-none text-[#dbdee1]">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[#202225] flex items-center justify-between shadow-sm bg-[#2b2d31]">
        <div className="flex items-center gap-2 truncate">
          <Hash className="w-5 h-5 text-neutral-400 shrink-0" />
          <div className="truncate">
            <h3 className="text-white font-bold text-xs truncate">
              {currentRoom ? `چت متنی ${currentRoom.name}` : 'چت عمومی سرور RTX'}
            </h3>
            <p className="text-[10px] text-neutral-400 truncate">
              {currentRoom ? 'گفتگوی حاضران در این روم' : 'گفتگو و تعامل اعضا'}
            </p>
          </div>
        </div>
        <div className="text-[11px] text-neutral-400 bg-[#1e1f22] px-2 py-0.5 rounded-full font-mono">
          {messages.length} پیام
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <div className="w-12 h-12 rounded-2xl bg-[#1e1f22] flex items-center justify-center mb-3 text-neutral-500">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">به چت خوش آمدید!</p>
            <p className="text-xs">نخستین پیام را در این کانال ارسال کنید.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 group relative text-right">
              <img
                src={msg.userAvatar}
                alt={msg.userName}
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-white hover:underline cursor-pointer">
                    {msg.userName}
                  </span>
                  {msg.userRole === 'admin' && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded flex items-center gap-0.5 font-medium">
                      <Crown className="w-2.5 h-2.5" /> ادمین
                    </span>
                  )}
                  {msg.userRole === 'vip' && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded flex items-center gap-0.5 font-medium">
                      <Star className="w-2.5 h-2.5" /> VIP
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-neutral-200 leading-relaxed break-words whitespace-pre-wrap">
                  {msg.content}
                </p>

                {/* Reactions list */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                      <button
                        key={emoji}
                        onClick={() => onAddReaction(msg.id, emoji)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition ${
                          userIds.includes(currentUser.id)
                            ? 'bg-[#5865f2]/20 border-[#5865f2] text-white'
                            : 'bg-[#1e1f22] border-[#35363c] text-neutral-300 hover:bg-[#35363c]'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-mono text-[10px]">{userIds.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Quick Reactions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 left-2 bg-[#2b2d31] border border-[#35363c] rounded-lg p-1 shadow-lg flex items-center gap-1">
                {COMMON_EMOJIS.slice(0, 3).map((em) => (
                  <button
                    key={em}
                    onClick={() => onAddReaction(msg.id, em)}
                    className="p-1 hover:bg-[#35363c] rounded text-xs transition"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-[#2b2d31]">
        <form
          onSubmit={handleSend}
          className="bg-[#383a40] rounded-xl px-3 py-2 flex items-center gap-2 border border-transparent focus-within:border-[#5865f2] transition"
        >
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`پیام به ${currentRoom ? currentRoom.name : 'چت روم'}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none max-h-24 py-1"
          />

          <div className="flex items-center gap-1 text-neutral-400">
            <button
              type="button"
              onClick={() => setInputText((prev) => prev + ' 🔥')}
              className="p-1.5 hover:text-white hover:bg-[#4e5058]/40 rounded-lg transition"
              title="ایموجی"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-1.5 text-white bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 disabled:hover:bg-[#5865f2] rounded-lg transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
