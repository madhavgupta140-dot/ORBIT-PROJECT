import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Heart,
  Send,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from './UserAvatar';
import { formatStoryRelativeTime } from '../lib/formatTime';
import { Story } from '../types';

const STORY_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'] as const;

export const StoryViewerModal: React.FC = () => {
  const {
    viewingStory,
    openStoryViewer,
    closeStoryViewer,
    deleteStory,
    stories,
    recordStoryView,
    sendMessage,
    reactToStory,
    removeStoryReaction,
    showToast,
    currentUser,
    authUser,
  } = useOrbit();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplyInputFocused, setIsReplyInputFocused] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Long-press emoji picker & heart bounce animation state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHeartBouncing, setIsHeartBouncing] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef<boolean>(false);

  // Group all active stories by creator across Orbit
  const allCreatorGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        authorUid: string;
        authorName: string;
        authorUsername: string;
        authorAvatar: string;
        stories: Story[];
      }
    >();

    // 1. Current user group first if they have active stories
    if (currentUser) {
      const myActive = stories.filter(
        (s) => s.authorUid === currentUser.id || s.authorId === currentUser.id
      );
      if (myActive.length > 0) {
        groupsMap.set(currentUser.id, {
          authorUid: currentUser.id,
          authorName: currentUser.name,
          authorUsername: currentUser.username,
          authorAvatar: currentUser.avatar || '',
          stories: myActive,
        });
      }
    }

    // 2. All other creators with active stories
    stories.forEach((story) => {
      const creatorUid = story.authorUid || story.authorId;
      if (!groupsMap.has(creatorUid)) {
        const authorStories = stories.filter(
          (s) => (s.authorUid || s.authorId) === creatorUid
        );
        groupsMap.set(creatorUid, {
          authorUid: creatorUid,
          authorName: story.authorName,
          authorUsername: story.authorUsername,
          authorAvatar: story.authorAvatar,
          stories: authorStories,
        });
      }
    });

    return Array.from(groupsMap.values());
  }, [stories, currentUser]);

  // Current creator's group index
  const currentCreatorIndex = useMemo(() => {
    if (!viewingStory) return -1;
    const targetUid = viewingStory.authorUid || viewingStory.authorId;
    return allCreatorGroups.findIndex((g) => g.authorUid === targetUid);
  }, [allCreatorGroups, viewingStory]);

  // Current creator's active stories sequence
  const currentCreatorStories = useMemo(() => {
    if (currentCreatorIndex >= 0) return allCreatorGroups[currentCreatorIndex].stories;
    if (!viewingStory) return [];
    const targetUid = viewingStory.authorUid || viewingStory.authorId;
    const authorStories = stories.filter(
      (s) => (s.authorUid || s.authorId) === targetUid
    );
    return authorStories.length > 0 ? authorStories : [viewingStory];
  }, [allCreatorGroups, currentCreatorIndex, viewingStory, stories]);

  // Index of current story within the creator's sequence
  const currentStoryIndex = useMemo(() => {
    if (!viewingStory) return 0;
    const idx = currentCreatorStories.findIndex((s) => s.id === viewingStory.id);
    return idx >= 0 ? idx : 0;
  }, [currentCreatorStories, viewingStory?.id]);

  // Relative timestamp (e.g. '5m', '1h', '18h', 'Just now')
  const relativeTime = useMemo(() => {
    return formatStoryRelativeTime(viewingStory?.createdAt);
  }, [viewingStory?.createdAt]);

  // Owner check: strictly current user
  const isOwner = Boolean(
    currentUser &&
      viewingStory &&
      (viewingStory.authorUid === currentUser.id ||
        viewingStory.authorId === currentUser.id ||
        authUser?.uid === viewingStory.authorUid ||
        authUser?.uid === viewingStory.authorId)
  );

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      openStoryViewer(currentCreatorStories[currentStoryIndex - 1], currentCreatorStories);
    } else if (currentCreatorIndex > 0) {
      const prevGroup = allCreatorGroups[currentCreatorIndex - 1];
      const targetStory = prevGroup.stories[prevGroup.stories.length - 1];
      openStoryViewer(targetStory, prevGroup.stories);
    } else {
      setProgress(0);
    }
  }, [currentStoryIndex, currentCreatorStories, currentCreatorIndex, allCreatorGroups, openStoryViewer]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < currentCreatorStories.length - 1) {
      openStoryViewer(currentCreatorStories[currentStoryIndex + 1], currentCreatorStories);
    } else if (currentCreatorIndex >= 0 && currentCreatorIndex < allCreatorGroups.length - 1) {
      const nextGroup = allCreatorGroups[currentCreatorIndex + 1];
      const targetStory = nextGroup.stories.find((s) => !s.viewed) || nextGroup.stories[0];
      openStoryViewer(targetStory, nextGroup.stories);
    } else {
      closeStoryViewer();
    }
  }, [currentStoryIndex, currentCreatorStories, currentCreatorIndex, allCreatorGroups, openStoryViewer, closeStoryViewer]);

  // Record story view once on active display
  useEffect(() => {
    if (!viewingStory) return;

    recordStoryView(viewingStory.id);

    setProgress(0);
    setReplyText('');
    setIsReplyInputFocused(false);
    setShowMoreMenu(false);
    setShowDeleteConfirm(false);
    setShowEmojiPicker(false);
    setIsMediaLoading(true);
    setMediaError(false);

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [viewingStory?.id, recordStoryView]);

  // Keyboard navigation on desktop
  useEffect(() => {
    if (!viewingStory) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in an input, do not capture arrow keys or space
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur();
          setIsReplyInputFocused(false);
          setIsPaused(false);
        }
        return;
      }

      if (showDeleteConfirm || isDeleting) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          setIsPaused(false);
        } else if (showMoreMenu) {
          setShowMoreMenu(false);
        } else {
          closeStoryViewer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewingStory,
    showDeleteConfirm,
    isDeleting,
    showEmojiPicker,
    showMoreMenu,
    handlePrev,
    handleNext,
    closeStoryViewer,
  ]);

  // Automatic progress timer (5 seconds per story)
  useEffect(() => {
    if (
      !viewingStory ||
      showDeleteConfirm ||
      isDeleting ||
      showMoreMenu ||
      showEmojiPicker ||
      isReplyInputFocused ||
      isMediaLoading ||
      mediaError
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (isPaused) return;

      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [
    viewingStory?.id,
    isPaused,
    showDeleteConfirm,
    isDeleting,
    showMoreMenu,
    showEmojiPicker,
    isReplyInputFocused,
    isMediaLoading,
    mediaError,
    handleNext,
  ]);

  if (!viewingStory) return null;

  // Story deletion handler with immediate state cleanup
  const handleDelete = async () => {
    if (!viewingStory || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteStory(viewingStory.id);

      // Advance or close viewer seamlessly
      if (currentCreatorStories.length > 1) {
        const remaining = currentCreatorStories.filter((s) => s.id !== viewingStory.id);
        if (currentStoryIndex < remaining.length) {
          openStoryViewer(remaining[currentStoryIndex], remaining);
        } else if (remaining.length > 0) {
          openStoryViewer(remaining[remaining.length - 1], remaining);
        } else {
          closeStoryViewer();
        }
      } else if (allCreatorGroups.length > 1) {
        const remainingGroups = allCreatorGroups.filter(
          (g) => g.authorUid !== (viewingStory.authorUid || viewingStory.authorId)
        );
        if (remainingGroups.length > 0) {
          openStoryViewer(remainingGroups[0].stories[0], remainingGroups[0].stories);
        } else {
          closeStoryViewer();
        }
      } else {
        closeStoryViewer();
      }
    } catch (err) {
      console.error('[ORBIT Story] Failed to delete story:', err);
      showToast('Error', 'Could not delete story.', 'alert');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setShowMoreMenu(false);
    }
  };

  // Direct reply submission
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !viewingStory) return;

    const recipientId = viewingStory.authorUid || viewingStory.authorId;
    sendMessage(recipientId, `Replied to your story: "${replyText.trim()}"`);
    setReplyText('');
    setIsReplyInputFocused(false);
    setIsPaused(false);
    showToast('Reply Sent', `Sent direct reply to @${viewingStory.authorUsername}`, 'success');
  };

  // Heart animation trigger (180ms bounce)
  const triggerHeartBounce = () => {
    setIsHeartBouncing(true);
    setTimeout(() => setIsHeartBouncing(false), 180);
  };

  // Quick heart tap handler
  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    if (!viewingStory) return;

    if (viewingStory.myReaction) {
      removeStoryReaction(viewingStory.id);
    } else {
      reactToStory(viewingStory.id, '❤️');
      triggerHeartBounce();
      setFloatingEmoji('❤️');
      setTimeout(() => setFloatingEmoji(null), 900);
    }
  };

  // Heart pointer down: detect ~350ms long-press to open emoji picker
  const handleHeartPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setShowEmojiPicker(true);
      setIsPaused(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(25);
        } catch {}
      }
    }, 350);
  };

  const handleHeartPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleHeartPointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Emoji picker selection
  const handleSelectEmoji = (emoji: string) => {
    setShowEmojiPicker(false);
    setIsPaused(false);
    if (!viewingStory) return;

    if (viewingStory.myReaction === emoji) {
      removeStoryReaction(viewingStory.id);
    } else {
      reactToStory(viewingStory.id, emoji);
      triggerHeartBounce();
      setFloatingEmoji(emoji);
      setTimeout(() => setFloatingEmoji(null), 900);
    }
  };

  // Tap navigation & hold-to-pause logic
  const handleZonePointerDown = () => {
    pointerDownTimeRef.current = Date.now();
    setIsPaused(true);
  };

  const handleZonePointerUp = () => {
    setIsPaused(false);
  };

  const handleZonePointerCancel = () => {
    setIsPaused(false);
  };

  const handleZoneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      isReplyInputFocused ||
      showEmojiPicker ||
      showMoreMenu ||
      showDeleteConfirm ||
      mediaError
    ) {
      return;
    }

    // If held for > 280ms, treat as pause release, not navigation tap
    const holdDuration = Date.now() - pointerDownTimeRef.current;
    if (holdDuration > 280) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const mediaSource = viewingStory.mediaUrl || viewingStory.downloadURL || viewingStory.media;
  const hasPrev = currentStoryIndex > 0 || currentCreatorIndex > 0;
  const hasNext =
    currentStoryIndex < currentCreatorStories.length - 1 ||
    currentCreatorIndex < allCreatorGroups.length - 1;

  return (
    <div
      id="orbit-story-viewer-modal"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) closeStoryViewer();
      }}
    >
      {/* Desktop Previous Arrow */}
      {hasPrev && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous story"
          className="hidden md:flex p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 mr-4 cursor-pointer transition-colors border border-stone-800/80 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Story Viewport Container */}
      <div className="relative w-full max-w-sm h-[90vh] max-h-[720px] bg-[#121212] border border-stone-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Segmented Progress Bars */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex gap-1.5">
          {currentCreatorStories.map((s, idx) => (
            <div
              key={s.id}
              className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden backdrop-blur-xs"
            >
              <div
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width:
                    idx < currentStoryIndex
                      ? '100%'
                      : idx === currentStoryIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header: Avatar, Username, Relative Time, Owner Options & Close Button */}
        <div className="absolute top-5 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/30 shrink-0">
              <UserAvatar
                src={viewingStory.authorAvatar}
                name={viewingStory.authorName}
                size="xs"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white drop-shadow-sm">
                {viewingStory.authorUsername || viewingStory.authorName}
              </span>
              <span className="text-white/60 text-xs font-normal">•</span>
              <span className="text-white/75 text-xs font-normal">
                {relativeTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Story Owner ONLY: Three-dot menu */}
            {isOwner && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu((prev) => !prev);
                  }}
                  aria-label="Story options"
                  className="p-1.5 rounded-full text-white/90 hover:text-white hover:bg-black/40 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-5 h-5 drop-shadow" />
                </button>

                {showMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                      }}
                    />
                    <div
                      className="absolute right-0 top-9 w-40 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Story</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMoreMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-300 hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left w-full"
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Delete Confirmation Prompt */}
                {showDeleteConfirm && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDeleting) setShowDeleteConfirm(false);
                    }}
                  >
                    <div
                      className="w-full max-w-xs bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-white">Delete Story?</h3>
                        <p className="text-xs text-stone-400">
                          This story will be removed permanently from your broadcast.
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 text-xs text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <span>Delete</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeStoryViewer();
              }}
              aria-label="Close story viewer"
              className="p-1.5 rounded-full text-white/90 hover:text-white hover:bg-black/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 drop-shadow" />
            </button>
          </div>
        </div>

        {/* Story Media Rendering Container */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          {isMediaLoading && !mediaError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-950 animate-pulse">
              <Loader2 className="w-8 h-8 text-white/60 animate-spin mb-2" />
              <span className="text-xs text-stone-400 font-mono">Loading story...</span>
            </div>
          )}

          {mediaError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-950 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mb-3 text-stone-400">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-stone-200 mb-1">Media Offline</p>
              <p className="text-xs text-stone-400 max-w-xs mb-4">
                Unable to display media payload.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMediaError(false);
                  setIsMediaLoading(true);
                  setRetryKey((k) => k + 1);
                }}
                className="px-4 py-2 bg-white text-black font-bold text-xs rounded-full flex items-center gap-1.5 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : viewingStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              key={`${viewingStory.id}_${retryKey}`}
              src={mediaSource}
              autoPlay
              muted
              playsInline
              loop
              onLoadedData={() => setIsMediaLoading(false)}
              onError={() => {
                setIsMediaLoading(false);
                setMediaError(true);
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={`${viewingStory.id}_${retryKey}`}
              src={mediaSource}
              alt="Story media"
              referrerPolicy="no-referrer"
              onLoad={() => setIsMediaLoading(false)}
              onError={() => {
                setIsMediaLoading(false);
                setMediaError(true);
              }}
              className="w-full h-full object-cover"
            />
          )}

          {/* Floating animated reaction burst */}
          {floatingEmoji && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="text-7xl animate-bounce drop-shadow-2xl select-none transform transition-transform duration-500 scale-125">
                {floatingEmoji}
              </div>
            </div>
          )}

          {/* Bottom subtle gradient for contrast */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />
        </div>

        {/* Tap Navigation & Hold-to-Pause Zone (Between Header and Bottom Bar) */}
        <div
          className="absolute inset-x-0 top-16 bottom-20 z-20 flex select-none"
          onPointerDown={handleZonePointerDown}
          onPointerUp={handleZonePointerUp}
          onPointerCancel={handleZonePointerCancel}
          onClick={handleZoneClick}
        >
          <div className="w-[35%] h-full cursor-w-resize" aria-label="Previous story zone" />
          <div className="w-[65%] h-full cursor-e-resize" aria-label="Next story zone" />
        </div>

        {/* Story Caption (if provided) */}
        {viewingStory.caption && (
          <div className="absolute bottom-20 left-4 right-4 z-20 text-center pointer-events-none">
            <p className="text-white text-sm font-medium drop-shadow-md leading-relaxed bg-black/55 backdrop-blur-xs py-1.5 px-3 rounded-xl inline-block max-w-[90%]">
              {viewingStory.caption}
            </p>
          </div>
        )}

        {/* Bottom Reaction Bar (Instagram Style: Reply field + Quick Heart button ONLY) */}
        <div
          className="relative z-30 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center gap-2.5 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Floating Long-Press Emoji Picker Pill */}
          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setShowEmojiPicker(false);
                  setIsPaused(false);
                }}
              />
              <div className="absolute right-3 bottom-14 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/95 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl animate-in fade-in zoom-in-75 duration-200">
                {STORY_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className={`p-1 text-2xl hover:scale-130 active:scale-110 transition-transform cursor-pointer rounded-full ${
                      viewingStory.myReaction === emoji ? 'bg-white/25 ring-1 ring-white/40' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Reply Text Field */}
          <form onSubmit={handleSendReply} className="flex-1 flex items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => {
                setIsReplyInputFocused(true);
                setIsPaused(true);
              }}
              onBlur={() => {
                setIsReplyInputFocused(false);
                setIsPaused(false);
              }}
              placeholder="Send a message..."
              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/25 focus:border-white/50 text-sm text-white px-4 py-2 rounded-full focus:outline-none placeholder:text-stone-300 transition-colors"
            />
          </form>

          {/* Quick Heart or Send Button */}
          {replyText.trim() ? (
            <button
              type="button"
              onClick={handleSendReply}
              aria-label="Send reply"
              className="p-2.5 bg-white text-black hover:bg-stone-200 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={handleHeartPointerDown}
              onPointerUp={handleHeartPointerUp}
              onPointerCancel={handleHeartPointerCancel}
              onClick={handleHeartClick}
              aria-label="React with heart or hold for more emojis"
              className={`p-2 rounded-full transition-transform duration-180 ease-out cursor-pointer shrink-0 select-none ${
                isHeartBouncing ? 'scale-135' : 'hover:scale-110 active:scale-95'
              }`}
            >
              {viewingStory.myReaction && viewingStory.myReaction !== '❤️' ? (
                <span className="text-2xl leading-none">{viewingStory.myReaction}</span>
              ) : (
                <Heart
                  className={`w-6 h-6 transition-colors duration-180 ${
                    viewingStory.myReaction === '❤️'
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-white hover:text-white/80'
                  }`}
                />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Next Arrow */}
      {hasNext && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next story"
          className="hidden md:flex p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 ml-4 cursor-pointer transition-colors border border-stone-800/80 hover:text-white"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
