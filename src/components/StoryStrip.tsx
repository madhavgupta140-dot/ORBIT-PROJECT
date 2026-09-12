import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { Story } from '../types';
import { UserAvatar } from './UserAvatar';

export const StoryStrip: React.FC = () => {
  const { stories, openStoryCreator, openStoryViewer, currentUser } = useOrbit();

  const currentUserId = currentUser?.id;

  // 1. Group current user's active non-deleted stories
  const myStories = useMemo(
    () => {
      if (!currentUserId) return [];
      return stories.filter((s) => s.authorUid === currentUserId || s.authorId === currentUserId);
    },
    [stories, currentUserId]
  );

  // 2. Group other creators' active stories: exactly ONE avatar per unique creator
  const otherUsersStoryGroups = useMemo(() => {
    if (!currentUserId) return [];
    const map = new Map<string, Story[]>();
    stories
      .filter((s) => s.authorUid !== currentUserId && s.authorId !== currentUserId)
      .forEach((story) => {
        const creatorId = story.authorUid || story.authorId;
        if (!creatorId) return;
        const list = map.get(creatorId) || [];
        list.push(story);
        map.set(creatorId, list);
      });
    return Array.from(map.values());
  }, [stories, currentUserId]);

  if (!currentUser) return null;

  return (
    <div
      id="orbit-story-strip"
      className="py-3 px-4 md:px-6 border-b border-stone-800/80 bg-[#0c0c0c] flex items-center gap-4 overflow-x-auto select-none no-scrollbar scroll-smooth"
    >
      {/* 1. Current User's "Your Story" Avatar (Always Single Avatar) */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className="relative cursor-pointer group"
          onClick={() => {
            if (myStories.length > 0) {
              openStoryViewer(myStories[0], myStories);
            } else {
              openStoryCreator();
            }
          }}
        >
          <div
            className={`p-[2px] rounded-full transition-transform duration-200 group-hover:scale-105 ${
              myStories.length > 0
                ? 'bg-gradient-to-tr from-stone-400 via-white to-stone-300 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
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

          {/* Plus icon on avatar - Always enables adding another story without duplicate circles */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openStoryCreator();
            }}
            title="Add another story"
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white hover:bg-stone-200 text-black flex items-center justify-center border-2 border-[#0c0c0c] shadow-sm transition-transform hover:scale-110 cursor-pointer active:scale-95 z-10"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
        <span className="text-[11px] font-medium text-stone-300 truncate max-w-[68px]">
          Your story
        </span>
      </div>

      {/* 2. Other Users' Story Groups (One Avatar Per Creator) */}
      {otherUsersStoryGroups.length === 0 ? (
        <div className="flex items-center pl-2 text-[11px] text-stone-500 font-mono tracking-tight whitespace-nowrap">
          Stories disappear after 24 hours.
        </div>
      ) : (
        otherUsersStoryGroups.map((group: Story[]) => {
          const leadStory = group[0];
          const hasUnviewed = group.some((s) => !s.viewed);
          const targetStory = group.find((s) => !s.viewed) || leadStory;

          return (
            <button
              key={leadStory.authorUid || leadStory.authorId || leadStory.id}
              type="button"
              onClick={() => openStoryViewer(targetStory, group)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0 focus:outline-none"
            >
              <div
                className={`p-[2px] rounded-full transition-all duration-200 group-hover:scale-105 ${
                  !hasUnviewed
                    ? 'border-2 border-stone-800'
                    : 'bg-gradient-to-tr from-stone-500 via-white to-stone-300 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                }`}
              >
                <div className="p-[2px] bg-[#0c0c0c] rounded-full">
                  <UserAvatar
                    src={leadStory.authorAvatar}
                    name={leadStory.authorName}
                    size="custom"
                    className="w-14 h-14 group-hover:opacity-95 transition-opacity"
                  />
                </div>
              </div>
              <span
                className={`text-[11px] font-medium truncate max-w-[68px] transition-colors ${
                  !hasUnviewed
                    ? 'text-stone-500'
                    : 'text-stone-200 group-hover:text-white'
                }`}
              >
                {leadStory.authorName.split(' ')[0]}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
};
