import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { StoryStrip } from '../components/StoryStrip';
import { InlineComposer } from '../components/InlineComposer';
import { PostCard } from '../components/PostCard';

export const HomeView: React.FC = () => {
  const { posts, followingIds, openCreatePost, setActiveTab, currentUser } = useOrbit();
  const [activeSubTab, setActiveSubTab] = useState<'for_you' | 'following'>('for_you');

  // Filter posts based on active tab
  const displayPosts =
    activeSubTab === 'for_you'
      ? posts
      : posts.filter((p) => followingIds.includes(p.authorId) || (currentUser && p.authorId === currentUser.id));

  return (
    <div id="home-view" className="flex flex-col flex-1 min-h-screen bg-[#0a0a0a]">
      {/* Sticky Top Header Tabs */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[#0a0a0a]/90 border-b border-stone-800/80 flex items-stretch select-none">
        <button
          id="tab-for-you"
          onClick={() => setActiveSubTab('for_you')}
          className="flex-1 py-3.5 hover:bg-stone-900/40 transition-colors cursor-pointer text-center relative font-bold text-sm"
        >
          <span
            className={`transition-colors ${
              activeSubTab === 'for_you' ? 'text-stone-100 font-bold' : 'text-stone-400 font-medium'
            }`}
          >
            For you
          </span>
          {activeSubTab === 'for_you' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-white rounded-full" />
          )}
        </button>

        <button
          id="tab-following"
          onClick={() => setActiveSubTab('following')}
          className="flex-1 py-3.5 hover:bg-stone-900/40 transition-colors cursor-pointer text-center relative font-bold text-sm"
        >
          <span
            className={`transition-colors flex items-center justify-center gap-1.5 ${
              activeSubTab === 'following' ? 'text-stone-100 font-bold' : 'text-stone-400 font-medium'
            }`}
          >
            Following
            {followingIds.length > 0 && (
              <span className="text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded-full font-mono">
                {followingIds.length}
              </span>
            )}
          </span>
          {activeSubTab === 'following' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-white rounded-full" />
          )}
        </button>
      </div>

      {/* Story Carousel */}
      <StoryStrip />

      {/* Inline Post Composer */}
      <InlineComposer />

      {/* Feed Content Area */}
      <div className="flex-1 flex flex-col">
        {displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center select-none animate-in fade-in duration-200">
            <div className="w-12 h-12 border border-stone-800 bg-[#141414] rounded-2xl flex items-center justify-center text-stone-400 mb-4 shadow-inner">
              <Radio className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>

            <h2 className="font-bold text-lg text-white mb-1.5">
              Welcome to your Orbit timeline
            </h2>

            <p className="text-xs text-stone-400 max-w-sm mb-6 leading-relaxed">
              When you follow creators, their latest posts and thoughts will show up here in real time.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('explore')}
                className="px-5 py-2.5 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-full transition-all shadow-md cursor-pointer active:scale-95"
              >
                Find creators to follow
              </button>

              <button
                onClick={openCreatePost}
                className="px-5 py-2.5 bg-[#161616] hover:bg-[#202020] border border-stone-800 text-stone-200 font-bold text-xs rounded-full transition-colors cursor-pointer active:scale-95"
              >
                Write a post
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-stone-800/80">
            {displayPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
