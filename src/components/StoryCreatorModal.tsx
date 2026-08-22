import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Trash2, Send, Sparkles } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';

export const StoryCreatorModal: React.FC = () => {
  const { isStoryCreatorOpen, closeStoryCreator, addStory, showToast } = useOrbit();

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isStoryCreatorOpen) {
      setMediaUrl(null);
      setCaption('');
    }
  }, [isStoryCreatorOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStoryCreatorOpen) {
        closeStoryCreator();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStoryCreatorOpen, closeStoryCreator]);

  if (!isStoryCreatorOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showToast('Invalid Media', 'Please select an image or video file.', 'alert');
      return;
    }

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(isImage ? 'image' : 'video');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) {
      showToast('Media Required', 'Please choose a photo or video for your story.', 'alert');
      return;
    }

    addStory({
      media: mediaUrl,
      mediaType,
      caption: caption.trim() || undefined,
    });

    closeStoryCreator();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeStoryCreator();
      }}
    >
      <div className="w-full max-w-md bg-[#121212] border border-stone-800 rounded-2xl p-6 shadow-2xl relative text-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <h2 className="font-bold text-base text-stone-100">
              Add to Story
            </h2>
          </div>

          <button
            onClick={closeStoryCreator}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!mediaUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-stone-800 hover:border-stone-500 bg-[#161616] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center mb-3">
                <ImageIcon className="w-6 h-6 text-stone-300" />
              </div>
              <p className="font-bold text-sm text-stone-200">
                Choose photo or video
              </p>
              <p className="text-xs text-stone-500 mt-1">
                JPG, PNG, MP4 — 24h expiry
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-black h-72 flex items-center justify-center">
              {mediaType === 'video' ? (
                <video src={mediaUrl} controls className="h-full w-full object-contain" />
              ) : (
                <img src={mediaUrl} alt="Story preview" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => setMediaUrl(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white hover:text-red-400 rounded-full transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <input
              type="text"
              value={caption}
              maxLength={80}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption (optional)..."
              className="w-full bg-[#161616] border border-stone-800 focus:border-white text-xs text-stone-200 px-3.5 py-2.5 rounded-xl placeholder:text-stone-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800/80">
            <button
              type="button"
              onClick={closeStoryCreator}
              className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!mediaUrl}
              className="px-5 py-2 bg-white hover:bg-stone-200 disabled:opacity-40 text-black font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share Story</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
