import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share2,
  MoreHorizontal,
  Trash2,
  Eye,
  CheckCircle2,
  Globe,
  Users as UsersIcon,
  Lock,
  Send,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { Post } from '../types';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from './UserAvatar';

interface PostCardProps {
  post: Post;
}

function formatPostDate(dateStr: string): string {
  if (!dateStr) return 'Just now';
  if (dateStr === 'Just now' || dateStr === 'Recent') return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const {
    currentUser,
    toggleLikePost,
    toggleSavePost,
    toggleRepost,
    deletePost,
    addComment,
    openProfilePreview,
    getUserById,
    isFollowing,
    followUser,
    unfollowUser,
    showToast,
  } = useOrbit();

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

  const isAuthor = currentUser ? post.authorId === currentUser.id : false;
  const authorUser = getUserById(post.authorId);
  const following = authorUser ? isFollowing(authorUser.id) : false;

  // Double tap to like
  const handleMediaDoubleTap = () => {
    if (!post.likedByMe) {
      toggleLikePost(post.id);
    }
    setShowHeartOverlay(true);
    setTimeout(() => {
      setShowHeartOverlay(false);
    }, 850);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    addComment(post.id, commentInput);
    setCommentInput('');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`https://orbit.app/p/${post.id}`);
    }
    showToast('Link Copied', 'Post link copied to clipboard.', 'success');
  };

  // Helper to render text with clickable mentions
  const renderFormattedText = (content: string) => {
    const words = content.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith('@') && word.length > 1) {
        return (
          <span
            key={i}
            className="text-white hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              const pool = [...(currentUser ? [currentUser] : []), ...(authorUser ? [authorUser] : [])];
              const found = pool.find(
                (u) => u.username.toLowerCase() === word.slice(1).toLowerCase()
              );
              if (found) openProfilePreview(found);
            }}
          >
            {word}
          </span>
        );
      }
      return word;
    });
  };

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'Private':
        return (
          <span title="Private post" className="inline-flex">
            <Lock className="w-3 h-3 text-stone-300" />
          </span>
        );
      case 'Followers':
        return (
          <span title="Followers only" className="inline-flex">
            <UsersIcon className="w-3 h-3 text-stone-400" />
          </span>
        );
      default:
        return (
          <span title="Public" className="inline-flex">
            <Globe className="w-3 h-3 text-stone-500" />
          </span>
        );
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="border-b border-stone-800/80 bg-[#0c0c0c] hover:bg-[#0f0f0f]/60 transition-colors p-4 md:p-5 relative"
    >
      {/* Top Author Row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3">
          {/* Avatar with click to profile */}
          <button
            type="button"
            onClick={() => authorUser && openProfilePreview(authorUser)}
            className="relative cursor-pointer group shrink-0"
          >
            <UserAvatar
              src={post.authorAvatar}
              name={post.authorName}
              size="md"
              className="border border-stone-800 group-hover:border-stone-500 transition-colors"
            />
          </button>

          {/* Name, Handle, Timestamp */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => authorUser && openProfilePreview(authorUser)}
                className="font-bold text-sm text-stone-100 hover:text-white hover:underline transition-colors text-left"
              >
                {post.authorName}
              </button>
              {post.authorVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20 inline-block shrink-0" />
              )}
              <span className="text-stone-500 text-xs font-normal">
                @{post.authorUsername}
              </span>
              <span className="text-stone-600 text-xs">•</span>
              <span className="text-stone-500 text-xs">{formatPostDate(post.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
              {getVisibilityIcon()}
              <span>{post.visibility}</span>
            </div>
          </div>
        </div>

        {/* 3-Dots Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
            aria-label="Post options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#161616] border border-stone-800 rounded-xl p-1.5 shadow-2xl z-40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleShare();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-stone-400" />
                  <span>Copy post link</span>
                </button>

                {authorUser && !isAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (following) {
                        unfollowUser(authorUser.id);
                      } else {
                        followUser(authorUser.id);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    {following ? (
                      <>
                        <UserCheck className="w-4 h-4 text-stone-300" />
                        <span>Unfollow @{authorUser.username}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-stone-300" />
                        <span>Follow @{authorUser.username}</span>
                      </>
                    )}
                  </button>
                )}

                {authorUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      openProfilePreview(authorUser);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-stone-400" />
                    <span>View profile</span>
                  </button>
                )}

                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      deletePost(post.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left border-t border-stone-800/80 mt-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete post</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Post Text */}
      <div className="mb-3 text-sm text-stone-200 leading-relaxed whitespace-pre-line">
        {renderFormattedText(post.text)}
      </div>

      {/* Media Attachment with Double-Tap to Like */}
      {post.media && (
        <div
          className="relative mb-3 rounded-2xl overflow-hidden border border-stone-800 bg-black/60 max-h-[500px] flex items-center justify-center cursor-pointer select-none"
          onDoubleClick={handleMediaDoubleTap}
        >
          {post.mediaType === 'video' ? (
            <video
              src={post.media}
              controls
              className="w-full max-h-[500px] object-contain"
            />
          ) : (
            <img
              src={post.media}
              alt={post.mediaName || 'Post media'}
              className="w-full max-h-[500px] object-cover object-center hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />
          )}

          {showHeartOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 fade-in duration-200">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.8)] animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 text-stone-400 select-none text-xs">
        {/* Comment / Reply */}
        <button
          type="button"
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer group ${
            isCommentsOpen
              ? 'text-sky-400 bg-sky-500/10'
              : 'hover:text-sky-400 hover:bg-sky-500/10'
          }`}
          title="Replies"
        >
          <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="font-mono text-xs">{post.comments.length}</span>
        </button>

        {/* Repost */}
        <button
          type="button"
          onClick={() => toggleRepost(post.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer group ${
            post.repostedByMe
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'hover:text-emerald-400 hover:bg-emerald-500/10'
          }`}
          title="Repost"
        >
          <Repeat2 className="w-4 h-4 transition-transform group-hover:rotate-45" />
          <span className="font-mono text-xs">{post.reposts}</span>
        </button>

        {/* Like */}
        <button
          type="button"
          onClick={() => toggleLikePost(post.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer group ${
            post.likedByMe
              ? 'text-rose-500 bg-rose-500/10 font-bold'
              : 'hover:text-rose-500 hover:bg-rose-500/10'
          }`}
          title={post.likedByMe ? 'Unlike' : 'Like'}
        >
          <Heart
            className={`w-4 h-4 transition-transform group-hover:scale-125 ${
              post.likedByMe ? 'fill-rose-500 text-rose-500' : ''
            }`}
          />
          <span className="font-mono text-xs">{post.likes}</span>
        </button>

        {/* Bookmark */}
        <button
          type="button"
          onClick={() => toggleSavePost(post.id)}
          className={`p-1.5 rounded-full transition-colors cursor-pointer group ${
            post.savedByMe
              ? 'text-white bg-white/10'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title={post.savedByMe ? 'Remove from saved' : 'Save post'}
        >
          <Bookmark
            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
              post.savedByMe ? 'fill-white text-white' : ''
            }`}
          />
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={handleShare}
          className="p-1.5 rounded-full hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer group"
          title="Share"
        >
          <Share2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* Expandable Comments Drawer */}
      {isCommentsOpen && (
        <div className="mt-3 pt-3 border-t border-stone-800 flex flex-col gap-3">
          {/* Comments List */}
          {post.comments.length > 0 ? (
            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
              {post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2.5 bg-[#141414] border border-stone-800/80 p-3 rounded-xl text-xs"
                >
                  <UserAvatar
                    src={comment.authorAvatar}
                    name={comment.authorName}
                    size="xs"
                    className="w-7 h-7 shrink-0 mt-0.5"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-200">
                        {comment.authorName}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className="text-stone-300 mt-1 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 text-xs py-1 italic">
              No replies yet. Be the first to join the conversation.
            </p>
          )}

          {/* Comment Composer */}
          {currentUser && (
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <UserAvatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="xs"
                className="w-7 h-7"
              />
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Post your reply..."
                className="flex-1 bg-[#141414] border border-stone-800 focus:border-white text-xs text-stone-200 px-3.5 py-2 rounded-full placeholder:text-stone-500 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="px-3.5 py-1.5 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs rounded-full flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};
