import React, { useState, useRef } from 'react';
import { Image, Smile, Globe, Users, Lock, Send, X } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { VisibilityType } from '../types';
import { UserAvatar } from './UserAvatar';

export const InlineComposer: React.FC = () => {
  const { currentUser, createPost, showToast } = useOrbit();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('Public');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const maxChars = 280;
  const remaining = maxChars - text.length;
  const progressPercent = Math.min(100, (text.length / maxChars) * 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Invalid File', 'Please upload a photo or video.', 'alert');
      return;
    }

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaName(file.name);
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) {
      showToast('Empty Transmission', 'Please write something or attach media.', 'alert');
      return;
    }

    createPost({
      text: text.trim(),
      media: mediaUrl || undefined,
      mediaType: mediaUrl ? 'image' : undefined,
      mediaName: mediaName || undefined,
      visibility,
    });

    // Reset form
    setText('');
    setMediaUrl(null);
    setMediaName(null);
    setIsFocused(false);
  };

  return (
    <div
      id="inline-composer"
      className={`border-b border-stone-800/80 bg-[#0c0c0c] transition-all p-4 ${
        isFocused ? 'bg-[#0f0f0f]' : ''
      }`}
    >
      <form onSubmit={handlePost} className="flex gap-3.5">
        {/* User Avatar */}
        <div className="shrink-0 pt-0.5">
          <UserAvatar
            src={currentUser.avatar}
            name={currentUser.name}
            size="md"
            className="border border-stone-800 hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Composer Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Audience Selector Button */}
          {(isFocused || text.length > 0 || mediaUrl) && (
            <div className="mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-800 bg-[#161616] text-xs text-stone-300 font-medium cursor-pointer hover:bg-stone-800 transition-colors">
                {visibility === 'Public' ? (
                  <Globe className="w-3 h-3 text-stone-400" />
                ) : visibility === 'Followers' ? (
                  <Users className="w-3 h-3 text-stone-400" />
                ) : (
                  <Lock className="w-3 h-3 text-stone-400" />
                )}
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as VisibilityType)}
                  className="bg-transparent text-xs text-stone-200 focus:outline-none cursor-pointer appearance-none pr-1 font-semibold"
                >
                  <option value="Public" className="bg-[#121212] text-stone-200">
                    Everyone (Public)
                  </option>
                  <option value="Followers" className="bg-[#121212] text-stone-200">
                    Followers only
                  </option>
                  <option value="Private" className="bg-[#121212] text-stone-200">
                    Only you
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* Text Area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Transmit a signal to the Orbit..."
            maxLength={maxChars}
            rows={isFocused || text.length > 0 || mediaUrl ? 3 : 2}
            className="w-full bg-transparent text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none resize-none leading-relaxed font-sans"
          />

          {/* Media Attachment Preview */}
          {mediaUrl && (
            <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-stone-800 bg-black/40 max-h-72 shadow-lg">
              <img
                src={mediaUrl}
                alt="Upload preview"
                className="w-full h-full object-cover max-h-72"
              />
              <button
                type="button"
                onClick={() => {
                  setMediaUrl(null);
                  setMediaName(null);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white hover:text-red-400 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Toolbar & Action Row */}
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-800/80 mt-1">
            <div className="flex items-center gap-1">
              {/* Media Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image or video"
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const emojis = ['⚡', '✨', '🛰️', '🔥', '💡', '🚀'];
                  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                  setText((prev) => `${prev} ${emoji}`);
                }}
                title="Add emoji"
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Character Progress Ring */}
              {text.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5 transform -rotate-90">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke="#262626"
                        strokeWidth="2"
                        fill="transparent"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke={remaining < 20 ? '#ef4444' : '#ffffff'}
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray={50.26}
                        strokeDashoffset={50.26 - (50.26 * progressPercent) / 100}
                        className="transition-all duration-150"
                      />
                    </svg>
                  </div>
                  {remaining <= 20 && (
                    <span className="font-mono text-[11px] text-red-400 font-medium">
                      {remaining}
                    </span>
                  )}
                </div>
              )}

              {/* Submit Post Button */}
              <button
                type="submit"
                disabled={!text.trim() && !mediaUrl}
                className="px-4 py-1.5 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Send className="w-3 h-3" />
                <span>Transmit</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
