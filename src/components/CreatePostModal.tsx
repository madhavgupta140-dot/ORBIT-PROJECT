import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Globe,
  Trash2,
  Smile,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { VisibilityType } from '../types';
import { UserAvatar } from './UserAvatar';

export const CreatePostModal: React.FC = () => {
  const { isCreatePostOpen, closeCreatePost, createPost, showToast, currentUser, settings } = useOrbit();

  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>(settings?.privacy?.defaultPostVisibility || 'Public');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(undefined);
  const [mediaName, setMediaName] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isCreatePostOpen) {
      setVisibility(settings?.privacy?.defaultPostVisibility || 'Public');
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setText('');
      setMediaUrl(undefined);
      setMediaType(undefined);
      setMediaName(undefined);
      setVisibility(settings?.privacy?.defaultPostVisibility || 'Public');
    }
  }, [isCreatePostOpen, settings?.privacy?.defaultPostVisibility]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreatePostOpen) {
        closeCreatePost();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatePostOpen, closeCreatePost]);

  if (!isCreatePostOpen || !currentUser) return null;

  const handleFileProcess = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showToast('Unsupported Format', 'Please upload a JPG, PNG, MP4, or WebM file.', 'alert');
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('File Too Large', 'Maximum allowed file size is 25 MB.', 'alert');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setMediaUrl(objectUrl);
    setMediaType(isImage ? 'image' : 'video');
    setMediaName(file.name);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveMedia = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaUrl(undefined);
    setMediaType(undefined);
    setMediaName(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) {
      showToast('Empty Post', 'Please write something or attach an image.', 'alert');
      return;
    }

    setIsSubmitting(true);

    createPost({
      text: text.trim(),
      media: mediaUrl,
      mediaType,
      mediaName,
      visibility,
    });

    setIsSubmitting(false);
    closeCreatePost();
  };

  return (
    <div
      id="create-post-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCreatePost();
      }}
    >
      <div
        id="create-post-modal"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-stone-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-stone-100">
              Create New Post
            </h2>
          </div>

          <button
            onClick={closeCreatePost}
            aria-label="Close dialog"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* User Info Header */}
          <div className="flex items-center gap-3">
            <UserAvatar
              src={currentUser.avatar}
              name={currentUser.name}
              size="md"
              className="border border-stone-800"
            />
            <div className="flex flex-col">
              <span className="font-bold text-xs text-stone-100">
                {currentUser.name}
              </span>
              {/* Audience pill */}
              <div className="flex items-center gap-1 text-[11px] text-stone-400">
                <Globe className="w-3 h-3" />
                <span>Anyone can view & reply</span>
              </div>
            </div>
          </div>

          {/* Text Area */}
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={textareaRef}
              value={text}
              maxLength={280}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's happening? Share design updates, code, or ideas..."
              rows={4}
              className="w-full bg-transparent border-0 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex justify-end">
              <span
                className={`font-mono text-[10px] ${
                  text.length > 250 ? 'text-white font-bold' : 'text-stone-600'
                }`}
              >
                {text.length}/280
              </span>
            </div>
          </div>

          {/* Media Upload Area */}
          {!mediaUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-white bg-white/5 text-stone-100'
                  : 'border-stone-800 hover:border-stone-700 bg-[#161616] text-stone-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,video/mp4,video/webm"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <ImageIcon className="w-6 h-6 text-stone-300 mb-1.5" />
              <p className="font-bold text-xs text-stone-200">
                Click or drag photos & videos here
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                JPG, PNG, WebM up to 25 MB
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-black max-h-60 flex items-center justify-center">
              {mediaType === 'video' ? (
                <video src={mediaUrl} controls className="w-full max-h-60 object-contain" />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Upload preview"
                  className="w-full max-h-60 object-cover"
                />
              )}
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white hover:text-red-400 rounded-full transition-colors cursor-pointer"
                title="Remove media"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Visibility Controls & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-800/80">
            <div className="flex items-center gap-1.5 text-stone-400">
              <button
                type="button"
                onClick={() => setText((prev) => `${prev} ✨ `)}
                className="p-1.5 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeCreatePost}
                className="px-4 py-2 rounded-full text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!text.trim() && !mediaUrl)}
                className="px-5 py-2 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs rounded-full transition-all shadow-md cursor-pointer active:scale-95"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
