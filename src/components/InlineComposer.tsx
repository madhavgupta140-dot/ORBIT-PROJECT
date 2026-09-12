import React, { useState, useRef, useEffect } from 'react';
import { Image, Smile, Globe, Users, Lock, Send, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { VisibilityType } from '../types';
import { UserAvatar } from './UserAvatar';
import {
  uploadMedia,
  deleteUploadedMedia,
  UploadCanceledError,
  CancellableUpload,
} from '../services/mediaUploadService';

export const InlineComposer: React.FC = () => {
  const { currentUser, createPost, showToast } = useOrbit();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('Public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadRef = useRef<CancellableUpload | null>(null);

  useEffect(() => {
    return () => {
      if (activeUploadRef.current) {
        activeUploadRef.current.cancel();
      }
    };
  }, []);

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

    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }

    setUploadError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaName(file.name);
  };

  const handleRemoveMedia = () => {
    if (activeUploadRef.current) {
      activeUploadRef.current.cancel();
      activeUploadRef.current = null;
    }
    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }
    setSelectedFile(null);
    setMediaUrl(null);
    setMediaName(null);
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!text.trim() && !mediaUrl && !selectedFile) {
      showToast('Empty Transmission', 'Please write something or attach media.', 'alert');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    setUploadProgress(0);

    const generatedPostId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let uploadedStoragePath: string | undefined = undefined;

    try {
      let finalMediaUrl = mediaUrl;
      let downloadURL: string | undefined = undefined;
      let storagePath: string | undefined = undefined;

      if (selectedFile && currentUser) {
        const uploadTask = uploadMedia({
          file: selectedFile,
          folder: 'posts',
          entityId: generatedPostId,
          onProgress: (pct) => setUploadProgress(pct),
        });

        activeUploadRef.current = uploadTask;
        const uploadResult = await uploadTask.promise;
        activeUploadRef.current = null;

        downloadURL = uploadResult.downloadURL;
        storagePath = uploadResult.storagePath;
        uploadedStoragePath = uploadResult.storagePath;
        finalMediaUrl = uploadResult.downloadURL;

        if (!downloadURL) {
          throw new Error('Download URL verification failed');
        }
      }

      const mediaUrls = downloadURL ? [downloadURL] : (finalMediaUrl && !finalMediaUrl.startsWith('blob:') ? [finalMediaUrl] : []);
      const storagePaths = storagePath ? [storagePath] : [];

      const created = await createPost({
        text: text.trim(),
        media: finalMediaUrl || undefined,
        mediaUrl: finalMediaUrl || undefined,
        mediaUrls,
        downloadURL,
        storagePath,
        storagePaths,
        mediaType: finalMediaUrl ? (selectedFile?.type.startsWith('video/') ? 'video' : 'image') : undefined,
        mediaName: mediaName || undefined,
        visibility,
      });

      if (created) {
        // Reset form on success
        setText('');
        setSelectedFile(null);
        setMediaUrl(null);
        setMediaName(null);
        setUploadError(null);
        setUploadProgress(0);
        setIsFocused(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      if (err instanceof UploadCanceledError || err?.name === 'UploadCanceledError') {
        setIsSubmitting(false);
        setUploadProgress(0);
        return;
      }

      console.error('[ORBIT] Inline post failed:', err);
      if (uploadedStoragePath) {
        try {
          await deleteUploadedMedia(uploadedStoragePath);
        } catch {}
      }

      const msg = err?.userFacingMessage || err?.message || 'Failed to transmit post. Please try again.';
      setUploadError(msg);
      showToast('Upload Error', msg, 'alert');
    } finally {
      activeUploadRef.current = null;
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Transmit a signal to the Orbit..."
            maxLength={maxChars}
            rows={isFocused || text.length > 0 || mediaUrl ? 3 : 2}
            className="w-full bg-transparent text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none resize-none leading-relaxed font-sans disabled:opacity-60"
          />

          {/* Media Attachment Preview */}
          {mediaUrl && (
            <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-stone-800 bg-black/40 max-h-72 shadow-lg">
              {selectedFile?.type.startsWith('video/') ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full h-full object-cover max-h-72"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover max-h-72"
                />
              )}
              {!isSubmitting && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {isSubmitting && selectedFile && (
            <div className="mb-2 bg-stone-900/80 border border-stone-800 rounded-lg p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                  <span>Uploading media to cloud…</span>
                </span>
                <span className="font-mono text-stone-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-stone-800 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {uploadError && !isSubmitting && (
            <div className="mb-2 bg-red-950/40 border border-red-800/60 rounded-lg p-2.5 flex items-center justify-between gap-2 text-red-300 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={handlePost}
                className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Retry</span>
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
                disabled={isSubmitting}
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image or video"
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-40 rounded-full transition-colors cursor-pointer"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  const emojis = ['⚡', '✨', '🛰️', '🔥', '💡', '🚀'];
                  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                  setText((prev) => `${prev} ${emoji}`);
                }}
                title="Add emoji"
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-40 rounded-full transition-colors cursor-pointer"
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
                disabled={isSubmitting || (!text.trim() && !mediaUrl && !selectedFile)}
                className="px-4 py-1.5 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
                    <span>{selectedFile ? `Uploading ${uploadProgress}%` : 'Transmitting...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Transmit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
