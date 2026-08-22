import React, { useEffect, useState, useRef } from 'react';
import { X, Heart, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from './UserAvatar';

export const StoryViewerModal: React.FC = () => {
  const {
    viewingStory,
    openStoryViewer,
    closeStoryViewer,
    stories,
    markStoryViewed,
    sendMessage,
    showToast,
  } = useOrbit();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  const storiesRef = useRef(stories);
  storiesRef.current = stories;

  const currentIndex = stories.findIndex((s) => s.id === viewingStory?.id);

  // Mark viewed when story is opened
  useEffect(() => {
    if (!viewingStory) return;
    if (!viewingStory.viewed) {
      markStoryViewed(viewingStory.id);
    }
    setProgress(0);
    setIsLiked(false);
    setReplyText('');
  }, [viewingStory?.id, viewingStory?.viewed, markStoryViewed]);

  // Handle progress timer
  useEffect(() => {
    if (!viewingStory) {
      setProgress(0);
      return;
    }

    const timer = setInterval(() => {
      if (isPaused) return;

      setProgress((prev) => {
        if (prev >= 100) {
          const currentStories = storiesRef.current;
          const idx = currentStories.findIndex((s) => s.id === viewingStory.id);
          if (idx !== -1 && idx < currentStories.length - 1) {
            openStoryViewer(currentStories[idx + 1]);
          } else {
            closeStoryViewer();
          }
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [viewingStory?.id, isPaused, openStoryViewer, closeStoryViewer]);

  if (!viewingStory) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      openStoryViewer(stories[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      openStoryViewer(stories[currentIndex + 1]);
    } else {
      closeStoryViewer();
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    sendMessage(viewingStory.authorId, `Replied to your story: "${replyText.trim()}"`);
    setReplyText('');
    showToast('Reply Sent', `Sent direct reply to @${viewingStory.authorUsername}`, 'success');
  };

  const handleHeartReaction = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      sendMessage(viewingStory.authorId, '❤️ Liked your story');
      showToast('Reaction Sent', 'Sent ❤️ to story author');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeStoryViewer();
      }}
    >
      {/* Navigation Arrows for Desktop */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className="hidden md:flex p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 mr-4 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Story Viewport Container */}
      <div
        className="relative w-full max-w-sm h-[90vh] max-h-[700px] bg-[#121212] border border-stone-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Progress Segment Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
          {stories.map((s, idx) => (
            <div
              key={s.id}
              className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Author Badge & Close Button */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <UserAvatar
              src={viewingStory.authorAvatar}
              name={viewingStory.authorName}
              size="xs"
              className="w-7 h-7"
            />
            <div className="flex flex-col">
              <span className="font-bold text-xs text-white leading-tight">
                {viewingStory.authorName}
              </span>
              <span className="text-[10px] text-stone-300 font-mono leading-tight">
                {viewingStory.createdAt}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeStoryViewer}
            className="p-2 rounded-full bg-black/60 hover:bg-black text-white hover:text-stone-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Click Zones */}
        <div
          className="absolute inset-0 z-10 flex"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX < rect.width * 0.35) {
              handlePrev();
            } else {
              handleNext();
            }
          }}
        >
          <div className="w-1/3 h-full cursor-w-resize" />
          <div className="w-2/3 h-full cursor-e-resize" />
        </div>

        {/* Story Media (Image or Video) */}
        <div className="flex-1 bg-black flex items-center justify-center relative">
          {viewingStory.mediaType === 'video' ? (
            <video
              src={viewingStory.media}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : viewingStory.media ? (
            <img
              src={viewingStory.media}
              alt="Story media"
              className="w-full h-full object-cover"
            />
          ) : null}

          {/* Bottom Gradient for caption & input */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Story Caption */}
        {viewingStory.caption && (
          <div className="absolute bottom-16 left-4 right-4 z-20 text-center pointer-events-none">
            <p className="text-white text-sm font-medium drop-shadow-md leading-relaxed">
              {viewingStory.caption}
            </p>
          </div>
        )}

        {/* Reply Bar */}
        <div className="relative z-20 p-3 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center gap-2">
          <form onSubmit={handleSendReply} className="flex-1 flex items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder={`Reply to ${viewingStory.authorName.split(' ')[0]}...`}
              className="w-full bg-white/10 border border-white/20 focus:border-white text-xs text-white px-3.5 py-2 rounded-full focus:outline-none placeholder:text-stone-400"
            />
          </form>

          {replyText.trim() ? (
            <button
              type="button"
              onClick={handleSendReply}
              className="p-2 bg-white text-black rounded-full transition-transform hover:scale-105 cursor-pointer shrink-0 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleHeartReaction}
              className="p-2 text-white hover:text-rose-500 rounded-full transition-transform hover:scale-110 cursor-pointer shrink-0"
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Next Arrow for Desktop */}
      {currentIndex < stories.length - 1 && (
        <button
          type="button"
          onClick={handleNext}
          className="hidden md:flex p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 ml-4 cursor-pointer transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
