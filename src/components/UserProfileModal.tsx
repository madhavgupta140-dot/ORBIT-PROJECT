import React, { useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Globe,
  MapPin,
  UserPlus,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { PostCard } from './PostCard';
import { UserAvatar } from './UserAvatar';

export const UserProfileModal: React.FC = () => {
  const {
    viewingProfileUser,
    closeProfilePreview,
    currentUser,
    allUsers,
    followUser,
    unfollowUser,
    isFollowing,
    followingIds,
    followerIds,
    posts,
    openNewMessage,
    openFollowList,
  } = useOrbit();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingProfileUser) {
        closeProfilePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingProfileUser, closeProfilePreview]);

  if (!viewingProfileUser) return null;

  const liveUser = allUsers.find((u) => u.id === viewingProfileUser.id) || (currentUser?.id === viewingProfileUser.id ? currentUser : viewingProfileUser);
  const isMe = currentUser ? liveUser.id === currentUser.id : false;
  const following = isFollowing(liveUser.id);
  const userPosts = posts.filter((p) => p.authorId === liveUser.id);
  const displayLocation = liveUser.countryName || liveUser.location;
  const followerCount = isMe
    ? (typeof currentUser?.followerCount === 'number' ? Math.max(currentUser.followerCount, followerIds.length) : followerIds.length)
    : (typeof liveUser.followerCount === 'number' ? liveUser.followerCount : (typeof liveUser.followersCount === 'number' ? liveUser.followersCount : 0));
  const followingCount = isMe
    ? (typeof currentUser?.followingCount === 'number' ? Math.max(currentUser.followingCount, followingIds.length) : followingIds.length)
    : (typeof liveUser.followingCount === 'number' ? liveUser.followingCount : 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProfilePreview();
      }}
    >
      <div className="w-full max-w-xl bg-[#121212] border border-stone-800 rounded-2xl shadow-2xl relative text-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
        <button
          onClick={closeProfilePreview}
          className="absolute top-4 right-4 p-1.5 text-stone-300 hover:text-white bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-full cursor-pointer z-20 border border-stone-700/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Banner */}
        {viewingProfileUser.banner ? (
          <div className="relative h-28 sm:h-32 w-full bg-[#161616] border-b border-stone-800/80 shrink-0">
            <img
              src={viewingProfileUser.banner}
              alt={`${viewingProfileUser.name}'s banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative h-16 w-full bg-[#161616] border-b border-stone-800/80 shrink-0" />
        )}

        <div className="p-6 pt-0 flex flex-col flex-1 overflow-y-auto">
          {/* Profile Card Header */}
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-stone-800/80 ${viewingProfileUser.banner ? '-mt-10' : '-mt-8'}`}>
            <div className="flex items-center gap-4">
              <div className="p-1 rounded-full bg-[#121212] shrink-0">
                <UserAvatar
                  src={liveUser.avatar}
                  name={liveUser.name}
                  size="xl"
                  className="border-2 border-stone-800"
                />
              </div>
              <div className="flex flex-col pt-3">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-lg text-stone-100">
                    {liveUser.name}
                  </h2>
                  {liveUser.verified && (
                    <CheckCircle2 className="w-4 h-4 text-white fill-white/20" />
                  )}
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  @{liveUser.username}
                </span>
                <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                  {displayLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {displayLocation}
                    </span>
                  )}
                  {liveUser.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-stone-400" />
                      {liveUser.website.replace('https://', '')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openFollowList('following', liveUser)}
                    className="hover:underline cursor-pointer focus:outline-none transition-colors hover:text-stone-300"
                  >
                    <span className="font-bold text-stone-100">{followingCount}</span>{' '}
                    <span className="text-stone-500">Following</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openFollowList('followers', liveUser)}
                    className="hover:underline cursor-pointer focus:outline-none transition-colors hover:text-stone-300"
                  >
                    <span className="font-bold text-stone-100">{followerCount}</span>{' '}
                    <span className="text-stone-500">Followers</span>
                  </button>
                </div>
              </div>
            </div>

            {!isMe && (
              <div className="flex items-center gap-2 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    closeProfilePreview();
                    openNewMessage();
                  }}
                  className="p-2 bg-[#181818] hover:bg-stone-800 border border-stone-800 rounded-full text-stone-300 transition-colors cursor-pointer"
                  title="Send Message"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    following ? unfollowUser(liveUser.id) : followUser(liveUser.id)
                  }
                  className={`px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    following
                      ? 'border border-stone-700 bg-transparent text-stone-300 hover:border-red-500 hover:text-red-400'
                      : 'bg-white hover:bg-stone-200 text-black'
                  }`}
                >
                  {following ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          {liveUser.bio && (
            <div className="py-4 border-b border-stone-800/80">
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {liveUser.bio}
              </p>
            </div>
          )}

          {/* User's Posts Feed */}
          <div className="flex-1 overflow-y-auto pt-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-stone-400">
              Posts ({userPosts.length})
            </span>
            {userPosts.length === 0 ? (
              <div className="py-8 text-center text-stone-500">
                <p className="text-xs">No posts published yet</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-stone-800/80 border border-stone-800/80 rounded-xl overflow-hidden bg-[#0c0c0c]">
                {userPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
