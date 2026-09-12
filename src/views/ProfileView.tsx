import React, { useState } from 'react';
import {
  Edit3,
  MapPin,
  Globe,
  Calendar,
  Heart,
  MessageCircle,
  Bookmark,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  Camera,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { PostCard } from '../components/PostCard';
import { UserAvatar } from '../components/UserAvatar';
import { Post } from '../types';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    posts,
    savedPosts,
    followingIds,
    followerIds,
    openEditProfile,
    openCreatePost,
    openFollowList,
    showToast,
  } = useOrbit();

  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes' | 'saved'>('posts');
  const [selectedPostModal, setSelectedPostModal] = useState<Post | null>(null);

  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#0a0a0a] text-stone-500">
        Authenticating...
      </div>
    );
  }

  const myPosts = posts.filter((p) => p.authorId === currentUser.id);
  const myMediaPosts = myPosts.filter((p) => Boolean(p.media));
  const myLikedPosts = posts.filter((p) => p.likedByMe);
  const mySavedPosts = savedPosts;

  const followersCount = typeof currentUser.followerCount === 'number'
    ? Math.max(currentUser.followerCount, followerIds.length)
    : followerIds.length;
  const followingCount = typeof currentUser.followingCount === 'number'
    ? Math.max(currentUser.followingCount, followingIds.length)
    : followingIds.length;
  const displayLocation = currentUser.countryName || currentUser.location;

  const getActiveList = () => {
    switch (activeTab) {
      case 'media':
        return myMediaPosts;
      case 'likes':
        return myLikedPosts;
      case 'saved':
        return mySavedPosts;
      default:
        return myPosts;
    }
  };

  const currentList = getActiveList();

  return (
    <div id="profile-view" className="flex flex-col flex-1 min-h-screen bg-[#0a0a0a]">
      {/* Header Banner Image */}
      <div className="relative h-44 sm:h-56 w-full bg-[#141414] border-b border-stone-800/80 overflow-hidden group">
        {currentUser.banner ? (
          <>
            <img
              src={currentUser.banner}
              alt={`${currentUser.name}'s banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#161616] flex items-center justify-center" />
        )}

        {/* Quick Add / Edit Banner Button on Hover */}
        <button
          type="button"
          onClick={openEditProfile}
          className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 hover:bg-black border border-stone-700 hover:border-white text-stone-200 hover:text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
          title={currentUser.banner ? 'Change header banner' : 'Add header banner'}
        >
          <Camera className="w-3.5 h-3.5 text-stone-300" />
          <span>{currentUser.banner ? 'Change Banner' : 'Add Banner'}</span>
        </button>
      </div>

      {/* Profile Details Header */}
      <div className="px-4 md:px-8 max-w-4xl w-full mx-auto relative -mt-16 sm:-mt-20">
        <div className="flex items-end justify-between gap-4 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="p-1 rounded-full bg-[#0a0a0a]">
              <UserAvatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="2xl"
                className="border-2 border-stone-800"
              />
            </div>
            <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[#0a0a0a]" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`https://orbit.app/${currentUser.username}`);
                }
                showToast('Profile Link Copied', 'Copied to clipboard!', 'success');
              }}
              className="p-2 bg-[#161616] hover:bg-stone-800 border border-stone-800 text-stone-300 rounded-full transition-colors cursor-pointer"
              title="Share profile"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={openEditProfile}
              className="px-4 py-2 bg-[#161616] hover:bg-[#202020] border border-stone-700 hover:border-white text-stone-100 font-bold text-xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-300" />
              <span>Edit profile</span>
            </button>
          </div>
        </div>

        {/* Identity & Bio */}
        <div className="flex flex-col gap-3 pb-5 border-b border-stone-800/80">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-xl sm:text-2xl text-stone-100">
                {currentUser.name}
              </h1>
              {currentUser.verified && (
                <CheckCircle2 className="w-5 h-5 text-white fill-white/20" />
              )}
            </div>
            <span className="text-stone-500 text-sm font-mono">
              @{currentUser.username}
            </span>
          </div>

          {currentUser.bio && (
            <p className="text-stone-300 text-sm leading-relaxed max-w-2xl">
              {currentUser.bio}
            </p>
          )}

          {/* Meta Details: Location, Website, Joined */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
            {displayLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {displayLocation}
              </span>
            )}
            {currentUser.website && (
              <a
                href={currentUser.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-stone-300 hover:text-white hover:underline"
              >
                <Globe className="w-3.5 h-3.5 text-stone-400" />
                {currentUser.website.replace('https://', '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              Joined {currentUser.joinedDate}
            </span>
          </div>

          {/* Followers & Following Counters */}
          <div className="flex items-center gap-5 text-sm pt-1">
            <button
              type="button"
              onClick={() => openFollowList('following', currentUser)}
              className="hover:underline cursor-pointer transition-colors hover:text-stone-300 focus:outline-none"
            >
              <span className="font-bold text-stone-100">{followingCount}</span>{' '}
              <span className="text-stone-500">Following</span>
            </button>
            <button
              type="button"
              onClick={() => openFollowList('followers', currentUser)}
              className="hover:underline cursor-pointer transition-colors hover:text-stone-300 focus:outline-none"
            >
              <span className="font-bold text-stone-100">{followersCount}</span>{' '}
              <span className="text-stone-500">Followers</span>
            </button>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center border-b border-stone-800/80 select-none">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors cursor-pointer relative ${
              activeTab === 'posts' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Posts ({myPosts.length})
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-white rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors cursor-pointer relative ${
              activeTab === 'media' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Media ({myMediaPosts.length})
            {activeTab === 'media' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-white rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors cursor-pointer relative ${
              activeTab === 'likes' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Likes ({myLikedPosts.length})
            {activeTab === 'likes' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-white rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors cursor-pointer relative ${
              activeTab === 'saved' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Saved ({mySavedPosts.length})
            {activeTab === 'saved' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <div className="w-12 h-12 border border-stone-800 bg-[#141414] rounded-2xl flex items-center justify-center text-stone-400 mb-4">
                {activeTab === 'saved' ? (
                  <Bookmark className="w-6 h-6 text-stone-300" />
                ) : activeTab === 'media' ? (
                  <ImageIcon className="w-6 h-6 text-stone-300" />
                ) : activeTab === 'likes' ? (
                  <Heart className="w-6 h-6 text-rose-500" />
                ) : (
                  <Edit3 className="w-6 h-6 text-stone-300" />
                )}
              </div>

              <h3 className="font-bold text-base text-stone-100 mb-1">
                {activeTab === 'saved'
                  ? 'No saved posts yet.'
                  : activeTab === 'media'
                  ? 'No Photos or Videos'
                  : activeTab === 'likes'
                  ? 'No Liked Posts Yet'
                  : 'No Posts Published'}
              </h3>

              <p className="text-xs text-stone-400 max-w-sm mb-6 leading-relaxed">
                {activeTab === 'saved'
                  ? 'Bookmark posts to revisit them later.'
                  : activeTab === 'media'
                  ? 'Photos and videos you attach to your posts will be archived here.'
                  : activeTab === 'likes'
                  ? 'Posts you have liked will show up in this private tab.'
                  : 'Share your work, design systems, or thoughts with the orbit.'}
              </p>

              {activeTab === 'posts' && (
                <button
                  onClick={openCreatePost}
                  className="px-5 py-2.5 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-full transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Create your first post
                </button>
              )}
            </div>
          ) : activeTab === 'media' ? (
            /* Instagram-style 3-column media grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
              {myMediaPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostModal(post)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#141414] border border-stone-800 group cursor-pointer"
                >
                  <img
                    src={post.media}
                    alt={post.text}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-xs">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>{post.comments.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Feed Cards */
            <div className="flex flex-col divide-y divide-stone-800/80 bg-[#0c0c0c] rounded-2xl border border-stone-800/80 overflow-hidden">
              {currentList.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPostModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPostModal(null)}
        >
          <div
            className="bg-[#0c0c0c] border border-stone-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <PostCard post={selectedPostModal} />
          </div>
        </div>
      )}
    </div>
  );
};
