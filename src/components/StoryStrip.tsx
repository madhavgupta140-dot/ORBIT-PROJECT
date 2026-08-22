import React from 'react';
import { Plus } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { Story } from '../types';
import { UserAvatar } from './UserAvatar';

export const StoryStrip: React.FC = () => {
  const { stories, openStoryCreator, openStoryViewer, currentUser } = useOrbit();

  if (!currentUser) return null;

  const myStory = stories.find((s) => s.authorId === currentUser.id);

  return (
    <div
      id="orbit-story-strip"
      className="py-3 px-4 md:px-6 border-b border-stone-800/80 bg-[#0c0c0c] flex items-center gap-4 overflow-x-auto select-none no-scrollbar scroll-smooth"
    >
      {/* 1. Current User Story Bubble */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="relative cursor-pointer group" onClick={myStory ? () => openStoryViewer(myStory) : openStoryCreator}>
          <div
            className={`p-[2px] rounded-full transition-transform duration-200 group-hover:scale-105 ${
              myStory
                ? 'bg-gradient-to-tr from-stone-400 via-white to-stone-300'
                : 'border border-dashed border-stone-700'
            }`}
          >
            <div className="p-[2px] bg-[#0c0c0c] rounded-full">
              <UserAvatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="custom"
                className="w-14 h-14"
              />
            </div>
          </div>

          {/* Plus icon on avatar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openStoryCreator();
            }}
            title="Create new story"
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white hover:bg-stone-200 text-black flex items-center justify-center border-2 border-[#0c0c0c] shadow-sm transition-transform hover:scale-110 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
        <span className="text-[11px] font-medium text-stone-300 truncate max-w-[68px]">
          Your story
        </span>
      </div>

      {/* 2. Other Users' Stories */}
      {stories
        .filter((s) => s.authorId !== currentUser.id)
        .map((story: Story) => {
          return (
            <button
              key={story.id}
              onClick={() => openStoryViewer(story)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0 focus:outline-none"
            >
              <div
                className={`p-[2px] rounded-full transition-all duration-200 group-hover:scale-105 ${
                  story.viewed
                    ? 'border-2 border-stone-800'
                    : 'bg-gradient-to-tr from-stone-500 via-white to-stone-300 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                }`}
              >
                <div className="p-[2px] bg-[#0c0c0c] rounded-full">
                  <UserAvatar
                    src={story.authorAvatar}
                    name={story.authorName}
                    size="custom"
                    className="w-14 h-14 group-hover:opacity-95 transition-opacity"
                  />
                </div>
              </div>
              <span
                className={`text-[11px] font-medium truncate max-w-[68px] transition-colors ${
                  story.viewed
                    ? 'text-stone-500'
                    : 'text-stone-200 group-hover:text-white'
                }`}
              >
                {story.authorName.split(' ')[0]}
              </span>
            </button>
          );
        })}
    </div>
  );
};
