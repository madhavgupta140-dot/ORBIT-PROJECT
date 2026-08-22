import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitLogo } from './OrbitLogo';

interface OrbitHeaderProps {
  title?: string;
  contextTag?: string;
}

export const OrbitHeader: React.FC<OrbitHeaderProps> = ({
  title,
  contextTag = 'MEMBERSHIP ACCESS // VERIFIED',
}) => {
  const {
    activeTab,
    openCreatePost,
    openSearch,
    toggleNotifications,
    unreadNotificationsCount,
  } = useOrbit();

  const getAutoTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'HOME';
      case 'explore':
        return 'EXPLORE';
      case 'messages':
        return 'MESSAGES';
      case 'profile':
        return 'PROFILE';
      case 'settings':
        return 'SETTINGS';
      default:
        return 'ORBIT';
    }
  };

  const displayTitle = title || getAutoTitle();

  return (
    <header
      id="orbit-global-header"
      className="sticky top-0 z-20 bg-[#0c0c0c]/95 backdrop-blur-md border-b border-stone-800/80 px-4 md:px-8 py-4 flex items-center justify-between"
    >
      {/* Left: Branding & Context & Page Title */}
      <div className="flex items-center gap-4">
        {/* Mobile-only Logo indicator */}
        <div className="md:hidden">
          <OrbitLogo size="sm" showWordmark={false} />
        </div>

        <div>
          {/* Small technical context label */}
          <div className="font-mono text-[10px] text-stone-500 tracking-[0.25em] uppercase flex items-center gap-2 font-medium">
            <span>{contextTag}</span>
          </div>

          {/* Large Condensed Page Title */}
          <h1 className="font-display font-black text-2xl md:text-3xl lg:text-4xl uppercase tracking-[0.08em] text-white leading-none mt-0.5">
            {displayTitle}
          </h1>
        </div>
      </div>

      {/* Right Controls: Search, Notification Bell, + Create */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search Trigger */}
        <button
          id="btn-search-trigger"
          onClick={openSearch}
          aria-label="Search Orbit"
          className="p-2.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-900 border border-transparent hover:border-stone-800 transition-all cursor-pointer group"
          title="Search Orbit (Ctrl+K)"
        >
          <Search className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" strokeWidth={1.5} />
        </button>

        {/* Notification Bell */}
        <button
          id="btn-notifications-trigger"
          onClick={toggleNotifications}
          aria-label="Orbit Notifications"
          className="relative p-2.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-900 border border-transparent hover:border-stone-800 transition-all cursor-pointer group"
          title="Notification Center"
        >
          <Bell className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" strokeWidth={1.5} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white" />
          )}
        </button>

        {/* Primary Create Button */}
        <button
          id="btn-primary-create"
          onClick={openCreatePost}
          className="flex items-center gap-1.5 px-3.5 md:px-4 py-2 bg-white hover:bg-stone-200 text-black font-display font-extrabold text-sm md:text-base uppercase tracking-[0.1em] rounded-full transition-all shadow-md cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create</span>
        </button>
      </div>
    </header>
  );
};
