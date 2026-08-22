import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CheckCircle2, UserPlus, UserCheck, Clock } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitStorage } from '../storage/orbitStorage';
import { UserAvatar } from './UserAvatar';

export const SearchOverlay: React.FC = () => {
  const {
    isSearchOpen,
    closeSearch,
    allUsers,
    posts,
    currentUser,
    openProfilePreview,
    followUser,
    unfollowUser,
    isFollowing,
    setActiveTab,
  } = useOrbit();

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(() => OrbitStorage.getSearchHistory());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  if (!isSearchOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Search Results
  const matchedUsers = trimmed
    ? (allUsers || []).filter(
        (u) =>
          u &&
          ((u.name && u.name.toLowerCase().includes(trimmed)) ||
            (u.username && u.username.toLowerCase().includes(trimmed)) ||
            (u.bio && u.bio.toLowerCase().includes(trimmed)) ||
            (Array.isArray(u.interests) && u.interests.some((i) => typeof i === 'string' && i.toLowerCase().includes(trimmed))))
      )
    : [];

  const matchedPosts = trimmed
    ? (posts || []).filter(
        (p) =>
          p &&
          ((p.text && p.text.toLowerCase().includes(trimmed)) ||
            (Array.isArray(p.tags) && p.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(trimmed))))
      )
    : [];

  const handleSelectHistory = (term: string) => {
    setQuery(term);
  };

  const handleAddSearchToHistory = (term: string) => {
    if (!term.trim()) return;
    const updated = [term.trim(), ...history.filter((h) => h !== term.trim())].slice(0, 8);
    setHistory(updated);
    OrbitStorage.saveSearchHistory(updated);
  };

  return (
    <div
      id="search-overlay-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 md:pt-24 p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div
        id="search-overlay-modal"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl bg-[#121212] border border-stone-800 rounded-2xl p-4 md:p-6 shadow-2xl relative text-stone-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-800/80 relative">
          <Search className="w-5 h-5 text-white shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSearchToHistory(query);
            }}
            placeholder="Search creators and transmissions..."
            className="w-full bg-transparent text-sm md:text-base text-stone-100 placeholder:text-stone-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-stone-500 hover:text-stone-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={closeSearch}
            className="p-1 text-stone-500 hover:text-stone-200 rounded-lg ml-1 cursor-pointer"
          >
            <kbd className="font-mono text-xs border border-stone-800 bg-stone-900 px-2 py-0.5 rounded">
              ESC
            </kbd>
          </button>
        </div>

        {/* Search Body Content */}
        <div className="max-h-[60vh] overflow-y-auto mt-4 pr-1 flex flex-col gap-5">
          {/* If no query: Show recent searches */}
          {!trimmed && history.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold mb-2">
                <span>Recent Searches</span>
                <button
                  onClick={() => {
                    setHistory([]);
                    OrbitStorage.saveSearchHistory([]);
                  }}
                  className="text-xs text-stone-400 hover:text-white hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectHistory(term)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] hover:bg-stone-800 border border-stone-800 rounded-full text-xs text-stone-300 hover:text-stone-100 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-stone-500" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results when searching */}
          {trimmed && (
            <>
              {/* Creators Result */}
              <div>
                <span className="text-xs text-stone-400 font-semibold mb-2 block">
                  Creators ({matchedUsers.length})
                </span>
                {matchedUsers.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-1">No creators matching &quot;{query}&quot;</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {matchedUsers.map((u) => {
                      const following = isFollowing(u.id);
                      const isMe = currentUser && u.id === currentUser.id;
                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 bg-[#161616] border border-stone-800/80 rounded-xl hover:border-stone-700 transition-colors"
                        >
                          <button
                            onClick={() => {
                              openProfilePreview(u);
                              closeSearch();
                            }}
                            className="flex items-center gap-3 text-left overflow-hidden cursor-pointer flex-1 mr-2"
                          >
                            <UserAvatar
                              src={u.avatar}
                              name={u.name}
                              size="md"
                              className="border border-stone-800"
                            />
                            <div className="flex flex-col overflow-hidden">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-xs text-stone-100 truncate">
                                  {u.name}
                                </span>
                                {u.verified && (
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <span className="text-[11px] text-stone-500 font-mono truncate">
                                @{u.username}
                              </span>
                            </div>
                          </button>

                          {!isMe && (
                            <button
                              onClick={() => (following ? unfollowUser(u.id) : followUser(u.id))}
                              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer shrink-0 flex items-center gap-1 active:scale-95 ${
                                following
                                  ? 'border border-stone-700 bg-transparent text-stone-300'
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Posts Result */}
              <div>
                <span className="text-xs text-stone-400 font-semibold mb-2 block">
                  Posts ({matchedPosts.length})
                </span>
                {matchedPosts.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-1">No posts found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {matchedPosts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveTab('home');
                          closeSearch();
                        }}
                        className="p-3 bg-[#161616] border border-stone-800/80 hover:border-stone-600 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1 text-[11px] text-stone-400">
                          <span className="font-bold text-stone-200">{p.authorName}</span>
                          <span className="text-stone-500 font-mono">@{p.authorUsername}</span>
                          <span>•</span>
                          <span className="text-stone-500">{p.createdAt}</span>
                        </div>
                        <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">{p.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
