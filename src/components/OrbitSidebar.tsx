import React, { useState } from 'react';
import {
  Home,
  Compass,
  Bell,
  MessageCircle,
  User,
  SlidersHorizontal,
  PlusCircle,
  MoreHorizontal,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { ActiveNavTab } from '../types';
import { OrbitLogo } from './OrbitLogo';
import { UserAvatar } from './UserAvatar';

export const OrbitSidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    openCreatePost,
    unreadNotificationsCount,
    signOutUser,
  } = useOrbit();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const navItems: Array<{
    id: ActiveNavTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  if (!currentUser) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        id="orbit-sidebar-desktop"
        className="hidden md:flex flex-col justify-between w-[72px] lg:w-[240px] h-screen fixed left-0 top-0 bg-[#0c0c0c] border-r border-stone-800/80 z-30 select-none py-4 px-3 lg:px-4"
      >
        <div className="flex flex-col">
          {/* Top Logo */}
          <div className="flex items-center px-2 py-3 mb-4">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center group cursor-pointer focus:outline-none"
              title="ORBIT"
            >
              <OrbitLogo size="md" responsiveWordmark={true} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 w-full" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-4 py-3 px-3.5 rounded-full transition-all duration-150 group cursor-pointer ${
                    isActive
                      ? 'bg-white/10 text-white font-bold'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900/60 font-medium'
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon
                      className={`w-6 h-6 transition-transform duration-150 group-hover:scale-105 ${
                        isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-100'
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.7}
                    />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0c0c0c]">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`hidden lg:inline-block text-base tracking-wide ${
                      isActive ? 'text-stone-100 font-bold' : 'text-stone-300'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* Post Button */}
            <button
              id="btn-sidebar-new-post"
              onClick={openCreatePost}
              className="mt-4 w-full py-3.5 px-3 bg-white hover:bg-stone-200 text-black font-bold text-sm lg:text-base rounded-full flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="hidden lg:inline-block">Post</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Pill */}
        <div className="relative pt-2">
          <button
            id="orbit-account-trigger"
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-full hover:bg-stone-900/80 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  size="md"
                  className="border border-stone-800"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0c0c0c]" />
              </div>
              <div className="hidden lg:flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-stone-100 truncate">
                    {currentUser.name}
                  </span>
                  {currentUser.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20 shrink-0" />
                  )}
                </div>
                <span className="text-xs text-stone-500 truncate">
                  @{currentUser.username}
                </span>
              </div>
            </div>

            <MoreHorizontal className="hidden lg:block w-4 h-4 text-stone-500 group-hover:text-stone-300" />
          </button>

          {/* Account Popover Menu */}
          {isAccountMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAccountMenuOpen(false)}
              />
              <div className="absolute left-0 lg:left-0 bottom-full mb-2 w-56 bg-[#161616] border border-stone-800 rounded-2xl p-2 shadow-2xl z-50 text-stone-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2.5 border-b border-stone-800/80 mb-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-stone-100 truncate">
                      {currentUser.name}
                    </p>
                    {currentUser.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 font-mono">
                    @{currentUser.username}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-stone-400" />
                  <span>View Profile</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-stone-400" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={async () => {
                    setIsAccountMenuOpen(false);
                    await signOutUser();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors text-left cursor-pointer border-t border-stone-800/80 mt-1"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< md viewports) */}
      <nav
        id="orbit-mobile-navbar"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0c0c]/95 backdrop-blur-lg border-t border-stone-800 z-40 flex items-center justify-around py-2.5 px-3"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={`mob-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.7} />
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-white" />
              )}
            </button>
          );
        })}

        {/* Mobile Create Post Floating Action */}
        <button
          onClick={openCreatePost}
          className="p-2.5 bg-white text-black rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer active:scale-95"
          title="Create post"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
};
