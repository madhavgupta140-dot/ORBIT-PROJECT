import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Trash2,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Video,
  XCircle,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import {
  uploadMedia,
  deleteUploadedMedia,
  UploadCanceledError,
  CancellableUpload,
} from '../services/mediaUploadService';

export const StoryCreatorModal: React.FC = () => {
  const { isStoryCreatorOpen, closeStoryCreator, addStory, showToast, currentUser } = useOrbit();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  
  // Upload status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadRef = useRef<CancellableUpload | null>(null);

  useEffect(() => {
    if (!isStoryCreatorOpen) {
      if (activeUploadRef.current) {
        activeUploadRef.current.cancel();
        activeUploadRef.current = null;
      }
      // Reset all states on close
      setSelectedFile(null);
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
      setMediaPreviewUrl(null);
      setCaption('');
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadError(null);
    }
  }, [isStoryCreatorOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStoryCreatorOpen && !isSubmitting) {
        closeStoryCreator();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStoryCreatorOpen, closeStoryCreator, isSubmitting]);

  if (!isStoryCreatorOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset errors
    setUploadError(null);

    // 1. Validate file object
    if (!(file instanceof File) || file.size <= 0) {
      showToast('Invalid Media', 'Please select a valid image or video file.', 'alert');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showToast('Invalid Format', 'Only image and video media are supported.', 'alert');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Limit media to 50MB
    const MAX_SIZE_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      showToast('File Too Large', 'Please select a media file under 50MB.', 'alert');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);
    setMediaType(isImage ? 'image' : 'video');
  };

  const handleClearMedia = () => {
    if (activeUploadRef.current) {
      activeUploadRef.current.cancel();
      activeUploadRef.current = null;
    }
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setSelectedFile(null);
    setMediaPreviewUrl(null);
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
    showToast('Upload Canceled', 'Story media upload was canceled.', 'default');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!selectedFile && !mediaPreviewUrl) {
      showToast('Media Required', 'Please select a photo or video for your story.', 'alert');
      return;
    }

    if (!currentUser) {
      showToast("Couldn't share story. Try again.", 'Please sign in to share your story.', 'alert');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    setUploadProgress(0);

    const storyId = `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let uploadedStoragePath: string | undefined = undefined;

    try {
      let downloadURL: string | undefined = undefined;

      // Stage 1: Upload to Storage with resumable tracking via single mediaUploadService
      if (selectedFile) {
        const uploadTask = uploadMedia({
          file: selectedFile,
          folder: 'stories',
          entityId: storyId,
          onProgress: (pct) => setUploadProgress(pct),
        });

        activeUploadRef.current = uploadTask;
        const uploadResult = await uploadTask.promise;
        activeUploadRef.current = null;

        downloadURL = uploadResult.downloadURL;
        uploadedStoragePath = uploadResult.storagePath;

        if (!downloadURL) {
          throw new Error('Download URL verification failed');
        }
      }

      // Stage 2: Finalizing and creating Firestore document only AFTER storage succeeds
      const finalMediaUrl = downloadURL || mediaPreviewUrl || '';

      await addStory({
        storyId,
        media: finalMediaUrl,
        downloadURL: downloadURL || finalMediaUrl,
        storagePath: uploadedStoragePath,
        mediaType,
        caption: caption.trim() || undefined,
      });

      setUploadProgress(100);
      showToast('Story shared', undefined, 'success');
      closeStoryCreator();
    } catch (err: any) {
      if (err instanceof UploadCanceledError || err?.name === 'UploadCanceledError') {
        setIsSubmitting(false);
        setUploadProgress(0);
        return;
      }

      console.error('[Story Pipeline] Publication error:', {
        code: err?.code,
        message: err?.message,
        error: err,
      });

      // Clean up orphaned storage object if firestore write fails
      if (uploadedStoragePath) {
        try {
          await deleteUploadedMedia(uploadedStoragePath);
        } catch (cleanErr) {
          console.warn('[Story Pipeline] Storage cleanup notice:', cleanErr);
        }
      }
      
      const userMsg = err?.userFacingMessage || err?.message || "Couldn't share story. Try again.";
      setUploadError(userMsg);
      showToast("Couldn't share story. Try again.", userMsg !== "Couldn't share story. Try again." ? userMsg : undefined, 'alert');
    } finally {
      activeUploadRef.current = null;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="orbit-story-creator-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) closeStoryCreator();
      }}
    >
      <div className="w-full max-w-md bg-[#121212] border border-stone-800 rounded-2xl p-6 shadow-2xl relative text-stone-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <h2 className="font-bold text-base text-stone-100">
              Create Story
            </h2>
          </div>

          <button
            type="button"
            onClick={closeStoryCreator}
            disabled={isSubmitting}
            aria-label="Close story creator"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          {/* Media Picker / Preview */}
          {!mediaPreviewUrl ? (
            <div
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-800 hover:border-stone-600 bg-[#171717] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              <div className="w-14 h-14 rounded-full bg-stone-900 group-hover:bg-stone-800 flex items-center justify-center mb-3 transition-colors">
                <ImageIcon className="w-7 h-7 text-stone-300" />
              </div>
              <p className="font-bold text-sm text-stone-200">
                Choose photo or video
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Stories disappear after 24 hours
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-black h-72 flex items-center justify-center">
              {mediaType === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    src={mediaPreviewUrl}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-stone-300 flex items-center gap-1">
                    <Video className="w-3 h-3 text-white" />
                    <span>Video Preview</span>
                  </div>
                </div>
              ) : (
                <img
                  src={mediaPreviewUrl}
                  alt="Story preview"
                  className="h-full w-full object-cover"
                />
              )}

              {/* Remove selected media button */}
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={handleClearMedia}
                  title="Remove selected media"
                  className="absolute top-2 right-2 p-2 bg-black/75 hover:bg-black text-white hover:text-red-400 rounded-full transition-colors cursor-pointer shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Optional Caption */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1 px-1">
              <span>Caption (optional)</span>
              <span>{caption.length}/150</span>
            </div>
            <input
              type="text"
              value={caption}
              maxLength={150}
              disabled={isSubmitting}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening right now?"
              className="w-full bg-[#171717] border border-stone-800 focus:border-white text-xs text-stone-200 px-3.5 py-2.5 rounded-xl placeholder:text-stone-500 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Progress / Status Box */}
          {isSubmitting && (
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

          {uploadError && !isSubmitting && (
            <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-3 flex items-start justify-between gap-3 text-red-300 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-200">Couldn't share story</p>
                  <p className="text-[11px] text-red-300/80 mt-0.5">{uploadError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try again</span>
              </button>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800/80 mt-auto">
            <button
              type="button"
              onClick={closeStoryCreator}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={(!mediaPreviewUrl && !selectedFile) || isSubmitting}
              className="px-5 py-2 bg-white hover:bg-stone-200 disabled:opacity-40 text-black font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Share Story</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

