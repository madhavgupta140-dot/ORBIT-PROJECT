import React from 'react';
import {
  Search,
  CheckCircle2,
  UserPlus,
  UserCheck,
  Activity,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';

export const SignalPanel: React.FC = () => {
  const {
    openSearch,
    openProfilePreview,
    isFollowing,
    followUser,
    unfollowUser,
    showToast,
    currentUser,
    allUsers,
    signalMetrics,
    nextMoves,
    openCreatePost,
    openStoryCreator,
    openEditProfile,
    setActiveTab,
    posts,
  } = useOrbit();

  if (!currentUser) return null;

  // Suggested users to follow (exclude current user)
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  // Network stats
  const totalTransmissions = posts.length;
  const mediaPostsCount = posts.filter((p) => !!p.media).length;

  const handleNextMoveClick = (move: typeof nextMoves[0]) => {
    if (move.actionType === 'create_post') {
      openCreatePost();
    } else if (move.actionType === 'add_story') {
      openStoryCreator();
    } else if (move.actionType === 'edit_profile') {
      openEditProfile();
    } else if (move.actionRoute) {
      setActiveTab(move.actionRoute);
    }
  };

  return (
    <aside
      id="orbit-right-sidebar"
      className="hidden xl:flex flex-col w-[320px] 2xl:w-[350px] bg-[#0c0c0c] border-l border-stone-800/80 p-4 gap-4 select-none shrink-0 h-screen sticky top-0 overflow-y-auto no-scrollbar"
    >
      {/* 1. Search Bar */}
      <div className="relative">
        <button
          type="button"
          onClick={openSearch}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#161616] hover:bg-[#1c1c1c] border border-stone-800 focus:border-stone-500 rounded-full text-stone-400 text-xs transition-colors cursor-pointer text-left group"
        >
          <Search className="w-4 h-4 text-stone-500 group-hover:text-stone-300" />
          <span className="flex-1 text-stone-400 group-hover:text-stone-200">
            Search Orbit...
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-stone-500 bg-stone-900 border border-stone-800 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* 2. Signal Score & Status Card */}
      <div className="bg-[#141414] border border-stone-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm text-stone-100">{signalMetrics.orbitStatus}</h3>
          </div>
          <span className="text-xs font-mono font-bold text-white">
            {signalMetrics.score}%
          </span>
        </div>

        {/* Progress meter bar */}
        <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-white transition-all duration-500 rounded-full"
            style={{ width: `${Math.max(5, signalMetrics.score)}%` }}
          />
        </div>

        <p className="text-xs text-stone-400 leading-relaxed mb-3">
          {signalMetrics.description}
        </p>

        {/* Next Moves checklist */}
        <div className="flex flex-col gap-2 pt-2 border-t border-stone-800/60">
          {nextMoves.slice(0, 2).map((move) => (
            <button
              key={move.id}
              onClick={() => handleNextMoveClick(move)}
              className="flex items-center justify-between p-2 rounded-xl bg-[#181818] hover:bg-[#202020] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-stone-400">
                  {move.step}
                </span>
                <span className="text-xs text-stone-200 truncate group-hover:text-white">
                  {move.title}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. Live Matrix Metrics */}
      <div className="bg-[#141414] border border-stone-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <h3 className="font-bold text-sm text-stone-100">Live Network</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            ONLINE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#191919] border border-stone-800/60 rounded-xl p-2.5">
            <span className="text-[11px] text-stone-400 block mb-1">Transmissions</span>
            <span className="text-base font-bold text-stone-100 font-mono">{totalTransmissions}</span>
          </div>
          <div className="bg-[#191919] border border-stone-800/60 rounded-xl p-2.5">
            <span className="text-[11px] text-stone-400 block mb-1">Media Signals</span>
            <span className="text-base font-bold text-white font-mono">{mediaPostsCount}</span>
          </div>
        </div>
      </div>

      {/* 4. Who to Follow */}
      {otherUsers.length > 0 && (
        <div className="bg-[#141414] border border-stone-800/80 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-stone-100 mb-3">Who to follow</h3>

          <div className="flex flex-col gap-3">
            {otherUsers.slice(0, 3).map((user) => {
              const following = isFollowing(user.id);

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-2.5"
                >
                  <div
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                    onClick={() => openProfilePreview(user)}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover border border-stone-800 group-hover:border-stone-500 transition-colors shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-stone-200 group-hover:text-white truncate">
                          {user.name}
                        </span>
                        {user.verified && (
                          <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500 truncate">
                        @{user.username}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (following) {
                        unfollowUser(user.id);
                      } else {
                        followUser(user.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 active:scale-95 ${
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
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Minimalist Footer */}
      <div className="mt-auto pt-4 text-[11px] text-stone-500 flex flex-wrap gap-x-3 gap-y-1.5 leading-relaxed font-sans border-t border-stone-900">
        <button
          onClick={() => setActiveTab('terms')}
          className="hover:text-stone-300 hover:underline transition-all cursor-pointer text-left"
        >
          Terms of Service
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className="hover:text-stone-300 hover:underline transition-all cursor-pointer text-left"
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className="hover:text-stone-300 hover:underline transition-all cursor-pointer text-left flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Status
        </button>
        <span>© 2026 Orbit, Inc.</span>
      </div>
    </aside>
  );
};
