import React, { useEffect } from 'react';
import { X, CheckCheck, Trash2, Heart, UserPlus, MessageSquare, Radio, Bell, Flame } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { NotificationType } from '../types';
import { UserAvatar } from './UserAvatar';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationsOpen,
    closeNotifications,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    openProfilePreview,
    getUserById,
    setActiveTab,
  } = useOrbit();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationsOpen) {
        closeNotifications();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationsOpen, closeNotifications]);

  if (!isNotificationsOpen) return null;

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />;
      case 'story_reaction':
        return <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />;
      case 'follow':
        return <UserPlus className="w-3 h-3 text-white" />;
      case 'message':
        return <MessageSquare className="w-3 h-3 text-stone-300" />;
      default:
        return <Radio className="w-3 h-3 text-white" />;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
        onClick={closeNotifications}
      />
      <div
        id="notifications-drawer"
        className="fixed top-16 right-4 md:right-8 w-full max-w-sm bg-[#141414] border border-stone-800 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150 text-stone-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-white" />
            <span className="font-bold text-sm text-stone-100">
              Notifications
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllNotificationsAsRead}
                  title="Mark all as read"
                  className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={clearAllNotifications}
                  title="Clear all alerts"
                  className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={closeNotifications}
              className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto pr-1 flex flex-col gap-2">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-stone-500">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-xs font-semibold">No notifications</p>
              <p className="text-[11px] text-stone-500 mt-0.5">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  if (notif.type === 'message') {
                    setActiveTab('messages');
                    closeNotifications();
                  } else if (notif.type === 'follow') {
                    const actor = getUserById(notif.actor.id);
                    if (actor) {
                      openProfilePreview(actor);
                      closeNotifications();
                    }
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-[#101010]/50 border-stone-800/60 text-stone-400'
                    : 'bg-[#1a1a1a] border-stone-700 text-stone-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative mt-0.5 shrink-0">
                    <UserAvatar
                      src={notif.actor.avatar}
                      name={notif.actor.name}
                      size="sm"
                      className="border border-stone-800"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-[#121212] p-0.5 rounded-full">
                      {getNotifIcon(notif.type)}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono shrink-0">
                        {notif.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">
                      {notif.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
