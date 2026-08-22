import React, { useState, useMemo } from 'react';
import {
  Search,
  Grid,
  List,
  Heart,
  MessageCircle,
  CheckCircle2,
  UserPlus,
  UserCheck,
  Plus,
  Radio,
  Image as ImageIcon,
  Flame,
  X,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { PostCard } from '../components/PostCard';
import { UserAvatar } from '../components/UserAvatar';
import { Post } from '../types';

export const ExploreView: React.FC = () => {
  const {
    posts,
    followUser,
    unfollowUser,
    isFollowing,
    openProfilePreview,
    allUsers,
    currentUser,
    openCreatePost,
  } = useOrbit();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'media'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [selectedPostModal, setSelectedPostModal] = useState<Post | null>(null);

  // Real creators (excluding current user)
  const otherUsers = useMemo(() => {
    if (!currentUser) return allUsers;
    return allUsers.filter((u) => u.id !== currentUser.id);
  }, [allUsers, currentUser]);

  // Filter posts based on search query and All vs Media Matrix
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        post.text.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query) ||
        post.authorUsername.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (selectedFilter === 'media') {
        return Boolean(post.media);
      }

      return true;
    });
  }, [posts, searchQuery, selectedFilter]);

  return (
    <div id="explore-view" className="flex flex-col flex-1 min-h-screen bg-[#0a0a0a]">
      {/* Top Search & Filter Bar */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a0a]/90 border-b border-stone-800/80 p-4 flex flex-col gap-3">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transmissions or creators..."
              className="w-full bg-[#141414] border border-stone-800 focus:border-stone-500 rounded-xl pl-10 pr-9 py-2.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#141414] border border-stone-800 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('feed')}
              title="Feed View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'feed'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Explore Navigation */}
        <div className="flex items-center gap-2 select-none py-0.5">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 active:scale-95 ${
              selectedFilter === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'bg-[#141414] text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800/80'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>All Transmissions</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('media')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 active:scale-95 ${
              selectedFilter === 'media'
                ? 'bg-white text-black shadow-sm'
                : 'bg-[#141414] text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800/80'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media Matrix</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto flex flex-col gap-6">
        {/* Real Network Creators Discovery */}
        {otherUsers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 select-none">
              <h2 className="font-bold text-xs uppercase tracking-wider text-stone-400 font-mono">
                Orbit Network Creators
              </h2>
              <span className="text-xs text-stone-500 font-mono">
                {otherUsers.length} profile{otherUsers.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherUsers.slice(0, 3).map((user) => {
                const following = isFollowing(user.id);
                return (
                  <div
                    key={user.id}
                    className="bg-[#121212] border border-stone-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-stone-700 transition-all group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer"
                          onClick={() => openProfilePreview(user)}
                        >
                          <UserAvatar
                            src={user.avatar}
                            name={user.name}
                            size="md"
                            className="border border-stone-800 group-hover:border-stone-500 transition-colors"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-xs text-stone-100 group-hover:text-white truncate">
                                {user.name}
                              </span>
                              {user.verified && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500 font-mono">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </div>

                      {user.bio && (
                        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed mb-3">
                          {user.bio}
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400 font-mono truncate max-w-[120px]">
                        @{user.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => (following ? unfollowUser(user.id) : followUser(user.id))}
                        className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                          following
                            ? 'border border-stone-700 bg-transparent text-stone-300 hover:border-red-500 hover:text-red-400'
                            : 'bg-white hover:bg-stone-200 text-black'
                        }`}
                      >
                        {following ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explore Media Grid or Feed */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between select-none pb-2 border-b border-stone-800/80">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-stone-100">
                {selectedFilter === 'all' ? 'Latest Transmissions' : 'Visual Transmissions (Media Matrix)'}
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-mono">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-200">
              <div className="w-14 h-14 border border-stone-800 bg-[#121212] rounded-2xl flex items-center justify-center text-stone-400 mb-4 shadow-inner">
                <Radio className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-base text-stone-200 mb-1.5">
                {selectedFilter === 'all' ? 'No Transmissions Found' : 'No Visual Media Found'}
              </h3>
              <p className="text-xs text-stone-400 max-w-sm mb-6 leading-relaxed">
                {searchQuery
                  ? `No matching results found for "${searchQuery}".`
                  : 'Be the first to publish a transmission to the orbit.'}
              </p>
              <button
                type="button"
                onClick={openCreatePost}
                className="px-5 py-2.5 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Publish Transmission</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid with Hover Metrics */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostModal(post)}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-[#121212] border border-stone-800/80 hover:border-stone-600 group cursor-pointer transition-all shadow-md"
                >
                  {post.media ? (
                    <img
                      src={post.media}
                      alt={post.text}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#161616] to-[#0c0c0c]">
                      <p className="text-xs text-stone-300 line-clamp-4 leading-relaxed font-sans">
                        {post.text}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
                        <span className="text-[11px] text-stone-400 font-mono truncate">
                          @{post.authorUsername}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Hover Metrics Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white font-bold text-xs backdrop-blur-[2px]">
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
            <div className="flex flex-col divide-y divide-stone-800/80 bg-[#0c0c0c] rounded-2xl border border-stone-800/80 overflow-hidden shadow-lg">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Post Lightbox Modal */}
      {selectedPostModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
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
