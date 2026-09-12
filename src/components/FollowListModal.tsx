import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Compass,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from './UserAvatar';
import { UserProfile } from '../types';
import { db, getUserProfile } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const FollowListModal: React.FC = () => {
  const {
    followListModal,
    closeFollowList,
    currentUser,
    allUsers,
    followUser,
    unfollowUser,
    isFollowing,
    followingIds,
    followerIds,
    openProfilePreview,
    setActiveTab,
  } = useOrbit();

  const [activeTab, setActiveTabMode] = useState<'followers' | 'following'>('followers');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  // Realtime fetched IDs for modal target user
  const [remoteFollowerIds, setRemoteFollowerIds] = useState<string[]>([]);
  const [remoteFollowingIds, setRemoteFollowingIds] = useState<string[]>([]);
  const [fetchedProfilesMap, setFetchedProfilesMap] = useState<Map<string, UserProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (followListModal.isOpen) {
      setActiveTabMode(followListModal.initialTab);
      setSearchQuery('');
      // Focus search after modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [followListModal.isOpen, followListModal.initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && followListModal.isOpen) {
        closeFollowList();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [followListModal.isOpen, closeFollowList]);

  const targetUser = followListModal.targetUser || currentUser;
  const targetUserId = targetUser?.id;
  const isMe = currentUser ? targetUserId === currentUser.id : true;

  // 1. Real-time query to Firestore for target user's followers & following
  useEffect(() => {
    if (!followListModal.isOpen || !targetUserId) return;

    setIsLoading(true);

    // Followers query: users where followingUid == targetUserId
    const followersQuery = query(
      collection(db, 'follows'),
      where('followingUid', '==', targetUserId)
    );

    const followersUnsub = onSnapshot(
      followersQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const followerUid = data.followerUid || (docSnap.id.includes('_') ? docSnap.id.split('_')[0] : docSnap.id);
          if (followerUid && !ids.includes(followerUid)) {
            ids.push(followerUid);
          }
        });
        setRemoteFollowerIds(ids);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[ORBIT FollowList] Followers query error:', err);
        setIsLoading(false);
      }
    );

    // Following query: users where followerUid == targetUserId
    const followingQuery = query(
      collection(db, 'follows'),
      where('followerUid', '==', targetUserId)
    );

    const followingUnsub = onSnapshot(
      followingQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const followingUid = data.followingUid || (docSnap.id.includes('_') ? docSnap.id.split('_')[1] : docSnap.id);
          if (followingUid && !ids.includes(followingUid)) {
            ids.push(followingUid);
          }
        });
        setRemoteFollowingIds(ids);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[ORBIT FollowList] Following query error:', err);
        setIsLoading(false);
      }
    );

    return () => {
      followersUnsub();
      followingUnsub();
    };
  }, [followListModal.isOpen, targetUserId]);

  // Combine remote IDs with local/context IDs for current user
  const effectiveFollowerIds = useMemo(() => {
    if (isMe) {
      const merged = Array.from(new Set([...followerIds, ...remoteFollowerIds]));
      return merged;
    }
    return remoteFollowerIds;
  }, [isMe, followerIds, remoteFollowerIds]);

  const effectiveFollowingIds = useMemo(() => {
    if (isMe) {
      const merged = Array.from(new Set([...followingIds, ...remoteFollowingIds]));
      return merged;
    }
    return remoteFollowingIds;
  }, [isMe, followingIds, remoteFollowingIds]);

  // Fetch missing user profile details in background
  useEffect(() => {
    const allNeededIds = Array.from(new Set([...effectiveFollowerIds, ...effectiveFollowingIds]));
    
    allNeededIds.forEach(async (uid) => {
      if (!uid) return;
      if (currentUser && uid === currentUser.id) return;
      if (allUsers.some((u) => u.id === uid)) return;
      if (fetchedProfilesMap.has(uid)) return;

      try {
        const fetched = await getUserProfile(uid);
        if (fetched) {
          setFetchedProfilesMap((prev) => {
            const next = new Map(prev);
            next.set(uid, fetched);
            return next;
          });
        }
      } catch (err) {
        // Silently continue
      }
    });
  }, [effectiveFollowerIds, effectiveFollowingIds, allUsers, currentUser, fetchedProfilesMap]);

  // Helper to resolve UserProfile from UID
  const resolveProfile = (uid: string): UserProfile => {
    if (currentUser && uid === currentUser.id) {
      return currentUser;
    }
    const foundInAll = allUsers.find((u) => u.id === uid);
    if (foundInAll) return foundInAll;

    const foundInFetched = fetchedProfilesMap.get(uid);
    if (foundInFetched) return foundInFetched;

    // Fallback profile
    return {
      id: uid,
      name: uid.startsWith('user_') ? uid.replace('user_', '') : 'Orbit Creator',
      username: uid.startsWith('user_') ? uid : `user_${uid.slice(0, 6)}`,
      avatar: '',
      bio: '',
      interests: [],
      joinedDate: 'Recent',
      trustLevel: 'Emerging',
    };
  };

  // Build resolved lists
  const followersList = useMemo(() => {
    return effectiveFollowerIds.map((id) => resolveProfile(id));
  }, [effectiveFollowerIds, allUsers, currentUser, fetchedProfilesMap]);

  const followingList = useMemo(() => {
    return effectiveFollowingIds.map((id) => resolveProfile(id));
  }, [effectiveFollowingIds, allUsers, currentUser, fetchedProfilesMap]);

  const currentList = activeTab === 'followers' ? followersList : followingList;

  // Filter list with search query
  const filteredUsers = useMemo(() => {
    const queryStr = searchQuery.trim().toLowerCase();
    if (!queryStr) return currentList;

    return currentList.filter((u) => {
      const matchName = u.name?.toLowerCase().includes(queryStr);
      const matchUsername = u.username?.toLowerCase().includes(queryStr);
      const matchBio = u.bio?.toLowerCase().includes(queryStr);
      return matchName || matchUsername || matchBio;
    });
  }, [currentList, searchQuery]);

  if (!followListModal.isOpen || !targetUser) return null;

  const handleUserClick = (user: UserProfile) => {
    closeFollowList();
    openProfilePreview(user);
  };

  return (
    <div
      id="follow-list-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeFollowList();
      }}
    >
      <div
        id="follow-list-modal"
        className="w-full sm:max-w-lg bg-[#121212] sm:border sm:border-stone-800 sm:rounded-2xl rounded-none shadow-2xl relative text-stone-200 animate-in fade-in zoom-in-95 duration-150 h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="p-4 pb-0 flex flex-col border-b border-stone-800/80 bg-[#141414] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-base text-stone-100 truncate">
                {targetUser.name}
              </span>
              <span className="text-xs text-stone-500 font-mono shrink-0">
                @{targetUser.username}
              </span>
            </div>

            <button
              type="button"
              onClick={closeFollowList}
              className="p-1.5 text-stone-400 hover:text-white bg-[#1a1a1a] hover:bg-stone-800 rounded-full transition-colors cursor-pointer border border-stone-800"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Tab Switcher */}
          <div className="flex items-center gap-1 select-none">
            <button
              type="button"
              onClick={() => {
                setActiveTabMode('followers');
                setSearchQuery('');
              }}
              className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold transition-all cursor-pointer relative flex items-center justify-center gap-2 ${
                activeTab === 'followers'
                  ? 'text-white'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <span>Followers</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  activeTab === 'followers'
                    ? 'bg-stone-800 text-stone-200'
                    : 'bg-[#181818] text-stone-600'
                }`}
              >
                {effectiveFollowerIds.length}
              </span>
              {activeTab === 'followers' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTabMode('following');
                setSearchQuery('');
              }}
              className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold transition-all cursor-pointer relative flex items-center justify-center gap-2 ${
                activeTab === 'following'
                  ? 'text-white'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <span>Following</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  activeTab === 'following'
                    ? 'bg-stone-800 text-stone-200'
                    : 'bg-[#181818] text-stone-600'
                }`}
              >
                {effectiveFollowingIds.length}
              </span>
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Search Bar */}
        <div className="p-3 border-b border-stone-800/80 bg-[#0e0e0e] shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-[#161616] border border-stone-800 focus:border-stone-600 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-stone-500 hover:text-stone-300 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal User List Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-stone-900/60">
          {isLoading && currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-stone-500 text-xs font-mono">Syncing orbit frequency...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="flex flex-col gap-1">
              {filteredUsers.map((user) => {
                const userIsMe = currentUser ? user.id === currentUser.id : false;
                const followingThisUser = isFollowing(user.id);
                const isHovered = hoveredUserId === user.id;

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-[#181818] transition-colors border border-transparent hover:border-stone-800/80 group"
                  >
                    {/* User Identity (Avatar + Details - Clickable) */}
                    <div
                      onClick={() => handleUserClick(user)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <UserAvatar
                        src={user.avatar}
                        name={user.name}
                        size="lg"
                        className="shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-stone-200 group-hover:text-white truncate">
                            {user.name}
                          </span>
                          {user.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20 shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-stone-500 font-mono truncate">
                          @{user.username}
                        </span>
                        {user.bio && (
                          <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Follow/Unfollow Action Button */}
                    <div className="shrink-0 pl-2">
                      {userIsMe ? (
                        <span className="px-3 py-1.5 bg-[#181818] border border-stone-800 text-stone-400 text-xs font-semibold rounded-full select-none inline-block">
                          You
                        </span>
                      ) : (
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredUserId(user.id)}
                          onMouseLeave={() => setHoveredUserId(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (followingThisUser) {
                              unfollowUser(user.id);
                            } else {
                              followUser(user.id);
                            }
                          }}
                          className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                            followingThisUser
                              ? isHovered
                                ? 'border border-red-500/80 bg-red-500/10 text-red-400'
                                : 'border border-stone-700 bg-transparent text-stone-300'
                              : 'bg-white hover:bg-stone-200 text-black shadow-sm'
                          }`}
                        >
                          {followingThisUser ? (
                            isHovered ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Unfollow</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                                <span>Following</span>
                              </>
                            )
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchQuery ? (
            /* Search Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-[#161616] border border-stone-800 flex items-center justify-center mb-2.5 text-stone-500">
                <Search className="w-4 h-4" />
              </div>
              <p className="text-stone-300 font-semibold text-xs sm:text-sm">No results found</p>
              <p className="text-stone-500 text-xs mt-1 max-w-xs">
                No users in this list match "{searchQuery}"
              </p>
            </div>
          ) : activeTab === 'followers' ? (
            /* Followers Empty State */
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[#161616] border border-stone-800 flex items-center justify-center mb-3 text-stone-500">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-stone-200 font-semibold text-sm">No followers yet.</p>
              <p className="text-stone-500 text-xs mt-1 max-w-xs">
                {isMe
                  ? 'When people subscribe to your signal transmission, they will appear here.'
                  : `@${targetUser.username} currently has no active followers in their orbit.`}
              </p>
            </div>
          ) : (
            /* Following Empty State */
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[#161616] border border-stone-800 flex items-center justify-center mb-3 text-stone-500">
                <Compass className="w-6 h-6" />
              </div>
              <p className="text-stone-200 font-semibold text-sm">
                {isMe ? "You're not following anyone yet." : `@${targetUser.username} is not following anyone yet.`}
              </p>
              <p className="text-stone-500 text-xs mt-1 max-w-xs">
                {isMe
                  ? 'Explore signals and follow creators across the Orbit network.'
                  : 'No connected creator frequencies.'}
              </p>
              {isMe && (
                <button
                  type="button"
                  onClick={() => {
                    closeFollowList();
                    setActiveTab('explore');
                  }}
                  className="mt-4 px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] border border-stone-700 hover:border-stone-500 text-stone-200 text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5 text-stone-400" />
                  <span>Discover Creators</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
