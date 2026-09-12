import React, { useState, useMemo } from 'react';
import {
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  Radio,
  CheckCheck,
  Sparkles,
  ArrowRight,
  Filter,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitNotification, NotificationType } from '../types';
import { UserAvatar } from '../components/UserAvatar';

function formatRelativeTime(dateStr: string | any): string {
  if (!dateStr) return 'Just now';
  if (dateStr === 'Just now' || dateStr === 'Recent') return dateStr;
  try {
    const d = typeof dateStr?.toDate === 'function' ? dateStr.toDate() : new Date(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : 'Just now';
    const diffSec不易 = Math.floor((Date.now() - d.getTime()) / 1000);
    const diffSec = diffSec不易 < 0 ? 0 : diffSec不易;
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Just now';
  }
}

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    openProfilePreview,
    getUserById,
    allUsers,
    setActiveTab,
    setActiveConversationId,
    posts,
    stories,
    openStoryViewer,
    currentUser,
  } = useOrbit();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'unread'>('all');

  const filteredNotifications = useMemo(() => {
    if (activeSubTab === 'unread') {
      return notifications.filter((n) => !n.read && !n.isRead);
    }
    return notifications;
  }, [notifications, activeSubTab]);

  const handleNotificationClick = (notif: OrbitNotification) => {
    // 1. Automatically mark as read
    if (!notif.read && !notif.isRead) {
      markNotificationAsRead(notif.id);
    }

    // 2. Route to relevant content
    const actor = getUserById(notif.actorUid) ||
      allUsers.find((u) => u.id === notif.actorUid) || {
        id: notif.actorUid,
        name: notif.actorName,
        username: notif.actorUsername,
        avatar: notif.actorAvatar,
        bio: '',
        interests: [],
        joinedDate: 'Recent',
        trustLevel: 'Emerging' as const,
      };

    switch (notif.type) {
      case 'follow': {
        if (actor) {
          openProfilePreview(actor);
        }
        break;
      }
      case 'like':
      case 'comment': {
        // Navigate to Home view and focus post if available
        setActiveTab('home');
        if (notif.targetId) {
          setTimeout(() => {
            const el = document.getElementById(`post-${notif.targetId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-white/40');
              setTimeout(() => el.classList.remove('ring-2', 'ring-white/40'), 2500);
            }
          }, 150);
        }
        break;
      }
      case 'message': {
        setActiveTab('messages');
        if (currentUser && notif.actorUid) {
          const convId = [currentUser.id, notif.actorUid].sort().join('_');
          setActiveConversationId(convId);
        }
        break;
      }
      case 'story_reaction': {
        const matchedStory = stories.find((s) => s.id === notif.targetId);
        if (matchedStory) {
          openStoryViewer(matchedStory);
        } else if (actor) {
          openProfilePreview(actor);
        }
        break;
      }
      default: {
        if (actor) {
          openProfilePreview(actor);
        }
        break;
      }
    }
  };

  const getActionSentence = (notif: OrbitNotification) => {
    const actorName = notif.actorName || notif.actor?.name || 'Someone';

    switch (notif.type) {
      case 'follow':
        return `${actorName} followed you`;
      case 'like':
        return `${actorName} liked your post`;
      case 'comment':
        return notif.text
          ? `${actorName} commented: "${notif.text}"`
          : `${actorName} commented on your post`;
      case 'story_reaction':
        return notif.text
          ? `${actorName} reacted to your story with ${notif.text}`
          : `${actorName} reacted to your story`;
      case 'message':
        return notif.text
          ? `${actorName} sent you a message: "${notif.text}"`
          : `You received a new message from ${actorName}`;
      default:
        return notif.title || `${actorName} interacted with your orbit`;
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-stone-200 fill-stone-200/20" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-white" />;
      case 'story_reaction':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />;
      case 'message':
        return <MessageCircle className="w-3.5 h-3.5 text-stone-300" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-white" />;
    }
  };

  return (
    <div id="orbit-notifications-view" className="w-full min-h-screen bg-[#0a0a0a] text-stone-200">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-stone-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100 flex items-center gap-2">
                Notifications
                {unreadNotificationsCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white text-black font-bold">
                    {unreadNotificationsCount}
                  </span>
                )}
              </h1>
              <p className="text-xs text-stone-500">
                Real-time signals, responses, and social frequencies
              </p>
            </div>
          </div>

          {unreadNotificationsCount > 0 && (
            <button
              id="btn-mark-all-read"
              onClick={markAllNotificationsAsRead}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-xs font-semibold text-stone-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <CheckCheck className="w-4 h-4 text-stone-400" />
              <span className="hidden sm:inline">Mark all as read</span>
              <span className="sm:hidden">Read all</span>
            </button>
          )}
        </div>

        {/* Tabs: All vs Unread */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-stone-900">
          <button
            id="tab-notifications-all"
            onClick={() => setActiveSubTab('all')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'all'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>All</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-400">
              {notifications.length}
            </span>
          </button>

          <button
            id="tab-notifications-unread"
            onClick={() => setActiveSubTab('unread')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'unread'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>Unread</span>
            {unreadNotificationsCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-white text-black font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {filteredNotifications.length === 0 ? (
          <div
            id="notifications-empty-state"
            className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-3xl bg-[#111111]/40 border border-stone-800/60"
          >
            <div className="w-16 h-16 rounded-2xl bg-stone-900/90 border border-stone-800 flex items-center justify-center text-stone-400 mb-4">
              <Bell className="w-8 h-8 opacity-60" />
            </div>
            <h2 className="text-lg font-bold text-stone-100 mb-1.5">
              You're all caught up.
            </h2>
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed">
              New activity across Orbit will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.read && !notif.isRead;
              const formattedTime = formatRelativeTime(notif.createdAt);
              const actionSentence = getActionSentence(notif);

              return (
                <div
                  key={notif.id}
                  id={`notification-item-${notif.id}`}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start gap-3.5 select-none ${
                    isUnread
                      ? 'bg-[#151515] border-stone-700/90 text-stone-100 shadow-md hover:border-stone-500'
                      : 'bg-[#101010]/60 border-stone-800/80 text-stone-400 hover:bg-[#131313] hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  {/* Subtle Unread Accent Indicator */}
                  {isUnread && (
                    <span
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-full bg-white shadow-sm"
                      title="Unread notification"
                    />
                  )}

                  {/* Actor Avatar with Type Badge */}
                  <div className="relative shrink-0 mt-0.5 ml-1">
                    <UserAvatar
                      src={notif.actorAvatar || notif.actor?.avatar}
                      name={notif.actorName || notif.actor?.name}
                      size="md"
                      className="border border-stone-800 ring-1 ring-stone-900"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-[#121212] border border-stone-800 p-1 rounded-full shadow-sm">
                      {getNotificationIcon(notif.type)}
                    </span>
                  </div>

                  {/* Notification Details */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            const actor = getUserById(notif.actorUid);
                            if (actor) openProfilePreview(actor);
                          }}
                          className={`font-bold text-sm truncate hover:underline ${
                            isUnread ? 'text-stone-100' : 'text-stone-200'
                          }`}
                        >
                          {notif.actorName || notif.actor?.name || 'Orbit Member'}
                        </span>
                        <span className="text-xs text-stone-500 font-mono">
                          @{notif.actorUsername || notif.actor?.username || 'member'}
                        </span>
                      </div>

                      <span className="text-xs text-stone-500 font-mono shrink-0">
                        {formattedTime}
                      </span>
                    </div>

                    <p
                      className={`text-sm leading-snug break-words ${
                        isUnread ? 'text-stone-200 font-medium' : 'text-stone-400'
                      }`}
                    >
                      {actionSentence}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
