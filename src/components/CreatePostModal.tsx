import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Globe,
  Trash2,
  Smile,
  AlertCircle,
  RefreshCw,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { VisibilityType } from '../types';
import { UserAvatar } from './UserAvatar';
import {
  uploadMedia,
  deleteUploadedMedia,
  UploadCanceledError,
  CancellableUpload,
} from '../services/mediaUploadService';

export const CreatePostModal: React.FC = () => {
  const { isCreatePostOpen, closeCreatePost, createPost, showToast, currentUser, settings } = useOrbit();

  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>(settings?.privacy?.defaultPostVisibility || 'Public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(undefined);
  const [mediaName, setMediaName] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeUploadRef = useRef<CancellableUpload | null>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isCreatePostOpen) {
      setVisibility(settings?.privacy?.defaultPostVisibility || 'Public');
      setUploadError(null);
      setUploadProgress(0);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      if (activeUploadRef.current) {
        activeUploadRef.current.cancel();
        activeUploadRef.current = null;
      }
      setText('');
      setSelectedFile(null);
      if (mediaUrl && mediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }
      setMediaUrl(undefined);
      setMediaType(undefined);
      setMediaName(undefined);
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadError(null);
      setVisibility(settings?.privacy?.defaultPostVisibility || 'Public');
    }
  }, [isCreatePostOpen, settings?.privacy?.defaultPostVisibility]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreatePostOpen && !isSubmitting) {
        closeCreatePost();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatePostOpen, closeCreatePost, isSubmitting]);

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

    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMediaUrl(objectUrl);
    setMediaType(isImage ? 'image' : 'video');
    setMediaName(file.name);
    setUploadError(null);
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
    if (activeUploadRef.current) {
      activeUploadRef.current.cancel();
      activeUploadRef.current = null;
    }
    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }
    setSelectedFile(null);
    setMediaUrl(undefined);
    setMediaType(undefined);
    setMediaName(undefined);
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    if (activeUploadRef.current) {
      activeUploadRef.current.cancel();
      activeUploadRef.current = null;
    }
    setIsSubmitting(false);
    setUploadProgress(0);
    showToast('Upload Canceled', 'Media upload was canceled.', 'default');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!text.trim() && !mediaUrl && !selectedFile) {
      showToast('Empty Post', 'Please write something or attach an image.', 'alert');
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

      // Resumable upload through unified mediaUploadService
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
        media: finalMediaUrl,
        mediaUrl: finalMediaUrl,
        mediaUrls,
        downloadURL,
        storagePath,
        storagePaths,
        mediaType: mediaType || (mediaUrls.length > 0 ? 'image' : undefined),
        mediaName,
        visibility,
      });

      if (created) {
        closeCreatePost();
      }
    } catch (err: any) {
      if (err instanceof UploadCanceledError || err?.name === 'UploadCanceledError') {
        setIsSubmitting(false);
        setUploadProgress(0);
        return;
      }

      console.error('[ORBIT] Post creation failed in modal:', err);
      // Clean up uploaded storage file if database creation failed
      if (uploadedStoragePath) {
        try {
          await deleteUploadedMedia(uploadedStoragePath);
        } catch {}
      }

      const msg = err?.userFacingMessage || err?.message || 'Failed to publish post. Please try again.';
      setUploadError(msg);
      showToast('Upload Error', msg, 'alert');
    } finally {
      activeUploadRef.current = null;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-post-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none"
      onClick={(e) => {
        if (!isSubmitting && e.target === e.currentTarget) closeCreatePost();
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
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer"
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
              disabled={isSubmitting}
              maxLength={280}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's happening? Share design updates, code, or ideas..."
              rows={4}
              className="w-full bg-transparent border-none text-stone-100 text-sm placeholder:text-stone-500 focus:outline-none resize-none disabled:opacity-50"
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

          {/* Drag and Drop Media Upload Zone */}
          {!mediaUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-white bg-stone-900/50'
                  : 'border-stone-800 hover:border-stone-700 bg-stone-900/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                disabled={isSubmitting}
                onChange={handleFileInputChange}
              />
              <ImageIcon className="w-6 h-6 text-stone-400" />
              <div className="text-center">
                <p className="text-xs font-semibold text-stone-300">
                  Click or drag and drop photos or videos
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Supports JPG, PNG, WebM, MP4 up to 25MB
                </p>
              </div>
            </div>
          ) : (
            /* Media Preview Box */
            <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-black/60 max-h-60 flex items-center justify-center">
              {mediaType === 'video' ? (
                <video
                  src={mediaUrl}
                  controls
                  className="max-h-60 w-full object-contain"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Post preview"
                  className="max-h-60 w-full object-cover"
                />
              )}
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  aria-label="Remove media"
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white hover:text-red-400 rounded-full transition-colors cursor-pointer shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Progress bar during media upload */}
          {isSubmitting && selectedFile && (
            <div className="bg-stone-900/90 border border-stone-700/80 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-200">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Uploading media to cloud…</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-stone-300">{uploadProgress}%</span>
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-medium hover:underline"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
              <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {uploadError && !isSubmitting && (
            <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-3 flex items-start justify-between gap-3 text-red-300 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-200">Upload failed</p>
                  <p className="text-[11px] text-red-300/80 mt-0.5">{uploadError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Visibility Controls & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-800/80">
            <div className="flex items-center gap-1.5 text-stone-400">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setText((prev) => `${prev} ✨ `)}
                className="p-1.5 hover:text-white hover:bg-stone-800 disabled:opacity-40 rounded-full transition-colors cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={closeCreatePost}
                className="px-4 py-2 rounded-full text-xs font-semibold text-stone-400 hover:text-stone-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!text.trim() && !mediaUrl)}
                className="px-5 py-2 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs rounded-full transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{selectedFile ? `Uploading ${uploadProgress}%` : 'Posting…'}</span>
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

