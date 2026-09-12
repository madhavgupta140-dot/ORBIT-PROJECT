import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserProfile,
  Post,
  PostComment,
  Story,
  StoryViewer,
  StoryReaction,
  Conversation,
  ChatMessage,
  GroupChat,
  GroupChatMessage,
  OrbitNotification,
  NotificationType,
  OrbitSettings,
  SignalMetrics,
  NextMoveItem,
  ActiveNavTab,
  ToastMessage,
  VisibilityType,
  ChatWorkspaceMode,
} from '../types';
import { OrbitStorage, calculateSignalMetrics } from '../storage/orbitStorage';
import { DEFAULT_SETTINGS } from '../data/seedData';
import {
  auth,
  db,
  signInWithGoogle,
  logOut,
  getUserProfile,
  saveUserProfile,
  registerUsername,
  sanitizeFirestoreData,
  handleFirestoreError,
  deleteMediaFile,
  OperationType,
} from '../lib/firebase';
import {
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  where,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  deleteField,
  Unsubscribe,
} from 'firebase/firestore';

function extractSettingsFromUserProfile(data: UserProfile | null | undefined, email?: string | null): OrbitSettings {
  if (!data) {
    return DEFAULT_SETTINGS;
  }
  const d = data as any;
  return {
    privacy: {
      profileVisibility: d.profileDiscoverability || d.profileVisibility || DEFAULT_SETTINGS.privacy.profileVisibility,
      defaultPostVisibility: d.defaultPostVisibility || DEFAULT_SETTINGS.privacy.defaultPostVisibility,
      whoCanMessageMe: d.directMessageReach || d.directMessagesReach || d.whoCanMessageMe || DEFAULT_SETTINGS.privacy.whoCanMessageMe,
      showActivityStatus: d.showActivityStatus ?? true,
      showOnlineStatus: d.showOnlineStatus ?? true,
      allowFollowRequests: d.allowFollowRequests ?? true,
    },
    notifications: {
      likes: d.likesNotifications ?? d.notifications?.likes ?? DEFAULT_SETTINGS.notifications.likes,
      mentions: d.mentionsNotifications ?? d.notifications?.mentions ?? d.notifications?.comments ?? DEFAULT_SETTINGS.notifications.mentions,
      followers: d.followerNotifications ?? d.notifications?.followers ?? d.notifications?.follows ?? DEFAULT_SETTINGS.notifications.followers,
      messages: d.directMessageNotifications ?? d.notifications?.messages ?? DEFAULT_SETTINGS.notifications.messages,
      storyReplies: d.storyNotifications ?? d.notifications?.storyReplies ?? d.notifications?.storyActivity ?? DEFAULT_SETTINGS.notifications.storyReplies,
      recommendations: d.recommendationNotifications ?? d.notifications?.recommendations ?? DEFAULT_SETTINGS.notifications.recommendations,
      comments: d.mentionsNotifications ?? d.notifications?.comments ?? d.notifications?.mentions ?? DEFAULT_SETTINGS.notifications.comments,
      follows: d.followerNotifications ?? d.notifications?.follows ?? d.notifications?.followers ?? DEFAULT_SETTINGS.notifications.follows,
      storyActivity: d.storyNotifications ?? d.notifications?.storyActivity ?? d.notifications?.storyReplies ?? DEFAULT_SETTINGS.notifications.storyActivity,
    },
    preferences: {
      theme: 'dark',
      reducedMotion: Boolean(d.reducedMotion),
      compactMode: Boolean(d.compactView ?? d.compactMode),
      compactView: Boolean(d.compactView ?? d.compactMode),
      autoplayVideo: false,
      dataSavingMode: false,
    },
    connections: {
      googleConnected: Boolean(email || d.id),
      googleEmail: email || undefined,
    },
  };
}

function parseMessageTime(createdAtRaw: any, timestampRaw: any, id?: string): { timeMs: number; displayTime: string } {
  // 1. Try Firestore Timestamp object (.toDate or .seconds)
  if (timestampRaw && typeof timestampRaw.toDate === 'function') {
    try {
      const d = timestampRaw.toDate();
      const ms = d.getTime();
      if (!isNaN(ms)) {
        return {
          timeMs: ms,
          displayTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
    } catch {}
  }
  if (createdAtRaw && typeof createdAtRaw.toDate === 'function') {
    try {
      const d = createdAtRaw.toDate();
      const ms = d.getTime();
      if (!isNaN(ms)) {
        return {
          timeMs: ms,
          displayTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
    } catch {}
  }
  if (timestampRaw && typeof timestampRaw === 'object' && typeof timestampRaw.seconds === 'number') {
    const ms = timestampRaw.seconds * 1000 + (timestampRaw.nanoseconds ? Math.floor(timestampRaw.nanoseconds / 1000000) : 0);
    const d = new Date(ms);
    return {
      timeMs: ms,
      displayTime: isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
  if (createdAtRaw && typeof createdAtRaw === 'object' && typeof createdAtRaw.seconds === 'number') {
    const ms = createdAtRaw.seconds * 1000 + (createdAtRaw.nanoseconds ? Math.floor(createdAtRaw.nanoseconds / 1000000) : 0);
    const d = new Date(ms);
    return {
      timeMs: ms,
      displayTime: isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // 2. Try Date instance
  if (createdAtRaw instanceof Date) {
    const ms = createdAtRaw.getTime();
    return {
      timeMs: isNaN(ms) ? 0 : ms,
      displayTime: isNaN(ms) ? 'Recently' : createdAtRaw.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
  if (timestampRaw instanceof Date) {
    const ms = timestampRaw.getTime();
    return {
      timeMs: isNaN(ms) ? 0 : ms,
      displayTime: isNaN(ms) ? 'Recently' : timestampRaw.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // 3. Try number (epoch ms or seconds)
  if (typeof createdAtRaw === 'number') {
    const ms = createdAtRaw < 10000000000 ? createdAtRaw * 1000 : createdAtRaw;
    const d = new Date(ms);
    return {
      timeMs: ms,
      displayTime: isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
  if (typeof timestampRaw === 'number') {
    const ms = timestampRaw < 10000000000 ? timestampRaw * 1000 : timestampRaw;
    const d = new Date(ms);
    return {
      timeMs: ms,
      displayTime: isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // 4. Try string (ISO date string or human formatted string)
  if (typeof createdAtRaw === 'string' && createdAtRaw.trim()) {
    const trimmed = createdAtRaw.trim();
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed) && parsed > 0) {
      const d = new Date(parsed);
      return {
        timeMs: parsed,
        displayTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }
    // Check if ID has a timestamp (e.g. msg_1724398123456)
    let fallbackMs = 0;
    if (id) {
      const match = id.match(/\d{10,13}/);
      if (match) {
        fallbackMs = parseInt(match[0], 10);
      }
    }
    return {
      timeMs: fallbackMs,
      displayTime: trimmed,
    };
  }

  // 5. Check if id has timestamp
  let idMs = 0;
  if (id) {
    const match = id.match(/\d{10,13}/);
    if (match) {
      idMs = parseInt(match[0], 10);
    }
  }

  return {
    timeMs: idMs || 0,
    displayTime: idMs ? new Date(idMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
  };
}

function normalizeAndSortMessages(
  rawMessages: any[],
  currentUserId?: string,
  deletedForMeSet?: Set<string>,
  clearedAtMs?: number
): ChatMessage[] {
  const map = new Map<string, { msg: ChatMessage; timeMs: number }>();

  for (const raw of rawMessages) {
    if (!raw) continue;
    const id = String(raw.id || `msg_${Math.random().toString(36).slice(2, 8)}`);

    // Check if this message was deleted specifically for the current user
    const isDeletedForUser = Boolean(
      (currentUserId && Array.isArray(raw.deletedFor) && raw.deletedFor.includes(currentUserId)) ||
      (deletedForMeSet && deletedForMeSet.has(id))
    );
    if (isDeletedForUser) {
      continue; // Never render deleted-for-me messages to this user
    }

    const { timeMs, displayTime } = parseMessageTime(raw.createdAt, raw.timestamp, id);

    // If conversation was cleared before this time for this user, do not resurrect prior messages
    if (clearedAtMs && timeMs > 0 && timeMs <= clearedAtMs) {
      continue;
    }

    const text = String(raw.text || raw.content || raw.message || '');
    const senderId = String(raw.senderId || raw.senderUid || raw.authorId || raw.from || '');
    if (!text.trim() && !senderId && !raw.mediaUrl) continue;

    const chatMsg: ChatMessage = {
      id,
      senderId,
      receiverId: String(raw.receiverId || raw.recipientId || raw.to || ''),
      text,
      createdAt: displayTime,
      rawCreatedAt: raw.createdAt || raw.timestamp,
      timestamp: timeMs,
      isRead: Boolean(raw.isRead),
      isForwarded: Boolean(raw.isForwarded || raw.forwarded),
      reactions: (raw.reactions && typeof raw.reactions === 'object' && !Array.isArray(raw.reactions)) ? raw.reactions : undefined,
      mediaUrl: raw.mediaUrl || raw.media || undefined,
      mediaType: raw.mediaType || undefined,
      mediaName: raw.mediaName || undefined,
      replyTo: raw.replyTo || undefined,
      replyToText: raw.replyToText || undefined,
      replyToName: raw.replyToName || undefined,
      senderName: raw.senderName || undefined,
      senderUsername: raw.senderUsername || undefined,
      senderAvatar: raw.senderAvatar || undefined,
      isSystem: Boolean(raw.isSystem),
      edited: Boolean(raw.edited),
      isDeleted: Boolean(raw.isDeleted || raw.deleted),
      deletedFor: Array.isArray(raw.deletedFor) ? raw.deletedFor : undefined,
      readBy: (raw.readBy && typeof raw.readBy === 'object') ? raw.readBy : undefined,
    };

    if (!map.has(id)) {
      map.set(id, { msg: chatMsg, timeMs });
    } else {
      const existing = map.get(id)!;
      map.set(id, {
        msg: {
          ...existing.msg,
          ...chatMsg,
          rawCreatedAt: chatMsg.rawCreatedAt || existing.msg.rawCreatedAt,
          timestamp: Math.max(existing.timeMs, timeMs),
          readBy: chatMsg.readBy || existing.msg.readBy,
          text: chatMsg.isDeleted ? '' : (chatMsg.text || existing.msg.text),
          createdAt: (chatMsg.createdAt && chatMsg.createdAt !== 'Recently') ? chatMsg.createdAt : existing.msg.createdAt,
          isForwarded: chatMsg.isForwarded !== undefined ? chatMsg.isForwarded : existing.msg.isForwarded,
          reactions: chatMsg.reactions !== undefined ? chatMsg.reactions : existing.msg.reactions,
          mediaUrl: chatMsg.isDeleted ? undefined : (chatMsg.mediaUrl || existing.msg.mediaUrl),
          mediaType: chatMsg.isDeleted ? undefined : (chatMsg.mediaType || existing.msg.mediaType),
          mediaName: chatMsg.isDeleted ? undefined : (chatMsg.mediaName || existing.msg.mediaName),
          replyTo: chatMsg.replyTo || existing.msg.replyTo,
          replyToText: chatMsg.replyToText || existing.msg.replyToText,
          replyToName: chatMsg.replyToName || existing.msg.replyToName,
          senderName: chatMsg.senderName || existing.msg.senderName,
          senderUsername: chatMsg.senderUsername || existing.msg.senderUsername,
          senderAvatar: chatMsg.senderAvatar || existing.msg.senderAvatar,
          isSystem: chatMsg.isSystem !== undefined ? chatMsg.isSystem : existing.msg.isSystem,
          edited: chatMsg.edited !== undefined ? chatMsg.edited : existing.msg.edited,
          isDeleted: chatMsg.isDeleted !== undefined ? chatMsg.isDeleted : existing.msg.isDeleted,
        },
        timeMs: Math.max(existing.timeMs, timeMs),
      });
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => {
    if (a.timeMs !== b.timeMs) {
      return a.timeMs - b.timeMs; // Ascending: oldest message first
    }
    return a.msg.id.localeCompare(b.msg.id);
  });

  return result.map((item) => item.msg);
}

interface OrbitContextType {
  // Navigation
  activeTab: ActiveNavTab;
  previousTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  navigateBack: () => void;

  // Authentication
  authUser: FirebaseUser | null;
  isAuthReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // User
  currentUser: UserProfile | null;
  updateCurrentUser: (updates: Partial<UserProfile>) => Promise<void>;
  allUsers: UserProfile[];
  getUserById: (id: string) => UserProfile | undefined;

  // Posts
  posts: Post[];
  savedPosts: Post[];
  savedPostIds: string[];
  createPost: (content: {
    text: string;
    media?: string;
    mediaUrl?: string;
    mediaUrls?: string[];
    downloadURL?: string;
    storagePath?: string;
    storagePaths?: string[];
    mediaType?: 'text' | 'image' | 'video';
    mediaName?: string;
    visibility: VisibilityType;
    tags?: string[];
  }) => Promise<Post | undefined>;
  deletePost: (postId: string) => Promise<void>;
  toggleLikePost: (postId: string) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;

  // Follows
  followingIds: string[];
  followerIds: string[];
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;

  // Stories
  stories: Story[];
  addStory: (data: {
    storyId?: string;
    media: string;
    mediaType: 'image' | 'video';
    downloadURL?: string;
    storagePath?: string;
    caption?: string;
  }) => Promise<Story | undefined>;
  deleteStory: (storyId: string) => Promise<void>;
  markStoryViewed: (storyId: string) => void;
  recordStoryView: (storyId: string) => Promise<void>;
  fetchStoryViewers: (storyId: string) => Promise<StoryViewer[]>;
  reactToStory: (storyId: string, emoji?: string) => Promise<void>;
  removeStoryReaction: (storyId: string) => Promise<void>;

  // Conversations & Messages
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (
    recipientId: string,
    text: string,
    options?: {
      isForwarded?: boolean;
      replyTo?: string;
      mediaUrl?: string;
      mediaType?: string;
      mediaName?: string;
    }
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  deleteMessageForMe: (conversationId: string, messageId: string) => Promise<void>;
  deleteMessageForEveryone: (conversationId: string, messageId: string) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, newText: string) => Promise<void>;
  deleteConversation: (conversationId: string, options?: { localOnly?: boolean }) => Promise<void>;
  togglePinConversation: (conversationId: string) => Promise<void>;
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  forwardMessage: (recipientId: string, message: ChatMessage) => Promise<void>;
  markConversationAsRead: (conversationId: string) => void;
  markMessagesAsSeen: (conversationId: string) => Promise<void>;

  // Presence & Workspace modes
  typingUsers: Record<string, { uid: string; name: string; username: string; timestamp: number }[]>;
  setTypingStatus: (conversationId: string, isTyping: boolean) => Promise<void>;
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  chatWorkspaceMode: ChatWorkspaceMode;
  setChatWorkspaceMode: (mode: ChatWorkspaceMode) => void;

  // Group Conversations
  groups: GroupChat[];
  createGroup: (
    name: string,
    memberUids: string[],
    photoURL?: string,
    description?: string
  ) => Promise<GroupChat | undefined>;
  sendGroupMessage: (
    groupId: string,
    text: string,
    options?: {
      mediaUrl?: string;
      mediaType?: string;
      mediaName?: string;
      replyTo?: string;
      replyToText?: string;
      replyToName?: string;
    }
  ) => Promise<void>;
  updateGroup: (
    groupId: string,
    updates: Partial<Pick<GroupChat, 'name' | 'photoURL' | 'description' | 'admins' | 'coAdmins' | 'members'>>
  ) => Promise<void>;
  promoteToCoAdmin: (groupId: string, memberUid: string) => Promise<void>;
  demoteFromCoAdmin: (groupId: string, memberUid: string) => Promise<void>;
  kickMember: (groupId: string, memberUid: string) => Promise<void>;
  addGroupMembers: (groupId: string, newMemberUids: string[]) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  deleteGroupForMe: (groupId: string) => Promise<void>;
  transferAdmin: (groupId: string, newOwnerUid: string) => Promise<void>;

  // Notifications
  notifications: OrbitNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => Promise<void> | void;
  markAllNotificationsAsRead: () => Promise<void> | void;
  clearAllNotifications: () => void;
  createNotification: (params: {
    recipientUid: string;
    type: NotificationType;
    targetId: string;
    targetType: 'user' | 'post' | 'comment' | 'story' | 'conversation' | 'message';
    text?: string;
  }) => Promise<void>;

  // Settings
  settings: OrbitSettings;
  updateSettings: (updates: Partial<OrbitSettings>) => void;

  // Signal & Next Moves
  signalMetrics: SignalMetrics;
  nextMoves: NextMoveItem[];

  // Modals & Overlays
  isCreatePostOpen: boolean;
  openCreatePost: () => void;
  closeCreatePost: () => void;

  isStoryCreatorOpen: boolean;
  openStoryCreator: () => void;
  closeStoryCreator: () => void;

  viewingStory: Story | null;
  viewingStorySequence: Story[];
  openStoryViewer: (story: Story, sequence?: Story[]) => void;
  closeStoryViewer: () => void;

  isEditProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;

  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  isNewMessageOpen: boolean;
  openNewMessage: () => void;
  closeNewMessage: () => void;

  isCreateGroupOpen: boolean;
  openCreateGroup: () => void;
  closeCreateGroup: () => void;

  viewingProfileUser: UserProfile | null;
  openProfilePreview: (user: UserProfile) => void;
  closeProfilePreview: () => void;

  isNotificationsOpen: boolean;
  toggleNotifications: () => void;
  closeNotifications: () => void;

  followListModal: {
    isOpen: boolean;
    initialTab: 'followers' | 'following';
    targetUser?: UserProfile | null;
  };
  openFollowList: (tab?: 'followers' | 'following', targetUser?: UserProfile | null) => void;
  closeFollowList: () => void;

  // Toast feedback
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'default' | 'success' | 'alert') => void;
  removeToast: (id: string) => void;
}

const OrbitContext = createContext<OrbitContextType | undefined>(undefined);

export const OrbitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<ActiveNavTab>('home');
  const [previousTab, setPreviousTab] = useState<ActiveNavTab>('home');

  const setActiveTab = useCallback((nextTab: ActiveNavTab) => {
    setActiveTabState((prev) => {
      if (prev !== nextTab) {
        if (prev !== 'privacy' && prev !== 'terms' && prev !== 'status') {
          setPreviousTab(prev);
        }
      }
      return nextTab;
    });
  }, []);

  const navigateBack = useCallback(() => {
    setActiveTabState((current) => {
      if (current === 'privacy' || current === 'terms' || current === 'status') {
        return previousTab || 'home';
      }
      return 'home';
    });
  }, [previousTab]);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => OrbitStorage.getUser());
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [repostedPostIds, setRepostedPostIds] = useState<string[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [directConversations, setDirectConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<OrbitNotification[]>([]);
  const [settings, setSettings] = useState<OrbitSettings>(() => OrbitStorage.getSettings());
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<UserProfile[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Track active real-time message subcollection listeners and cached messages
  const messageUnsubsRef = React.useRef<Map<string, () => void>>(new Map());
  const conversationMessagesMapRef = React.useRef<Map<string, ChatMessage[]>>(new Map());

  // Track active real-time group message subcollection listeners and cached messages
  const groupMessageUnsubsRef = React.useRef<Map<string, () => void>>(new Map());
  const groupMessagesMapRef = React.useRef<Map<string, ChatMessage[]>>(new Map());

  // Track active real-time post comments subcollection listeners and cached comments
  const postCommentsUnsubsRef = React.useRef<Map<string, () => void>>(new Map());
  const postCommentsMapRef = React.useRef<Map<string, PostComment[]>>(new Map());

  // Cache recorded story views to prevent duplicate writes
  const recordedViewsSetRef = React.useRef<Set<string>>(new Set());

  // Track messages deleted for the current user to persist deletion locally across sessions
  const deletedForMeSetRef = React.useRef<Set<string>>(new Set());

  // Track story IDs deleted to prevent ghost stories resurrection across transitions and re-snapshots
  const deletedStoryIdsRef = React.useRef<Set<string>>(new Set());

  // Track per-user conversation cleared timestamps to maintain visibility and prevent old messages from returning
  const clearedConversationsMapRef = React.useRef<Record<string, string>>({});

  // Synchronize deleted stories set from localStorage on mount
  useEffect(() => {
    try {
      const rawStories = localStorage.getItem('orbit_deleted_story_ids');
      if (rawStories) {
        const parsed = JSON.parse(rawStories);
        if (Array.isArray(parsed)) {
          deletedStoryIdsRef.current = new Set(parsed);
        }
      }
    } catch {}
  }, []);

  // Synchronize cleared conversations and deleted-for-me set from localStorage whenever authUser changes
  useEffect(() => {
    if (!authUser?.uid) {
      deletedForMeSetRef.current = new Set();
      clearedConversationsMapRef.current = {};
      return;
    }
    try {
      const raw = localStorage.getItem(`orbit_deleted_for_me_${authUser.uid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          deletedForMeSetRef.current = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load deletedForMe set from localStorage:', e);
    }
    try {
      const rawCleared = localStorage.getItem(`orbit_cleared_conversations_${authUser.uid}`);
      if (rawCleared) {
        clearedConversationsMapRef.current = JSON.parse(rawCleared);
      }
    } catch (e) {
      console.warn('Failed to load cleared conversations from localStorage:', e);
    }
  }, [authUser?.uid]);

  // Real-time computed posts with user's interaction flags (likes, reposts, saves)
  const posts = useMemo<Post[]>(() => {
    return rawPosts.map((p) => ({
      ...p,
      likedByMe: likedPostIds.includes(p.id),
      repostedByMe: repostedPostIds.includes(p.id),
      savedByMe: savedPostIds.includes(p.id),
    }));
  }, [rawPosts, likedPostIds, repostedPostIds, savedPostIds]);

  // Real-time bookmarked posts ordered strictly by newest saved first
  const savedPosts = useMemo<Post[]>(() => {
    return savedPostIds
      .map((id) => posts.find((p) => p.id === id))
      .filter((p): p is Post => p !== undefined);
  }, [savedPostIds, posts]);

  // Combined real-time conversations (direct messages + group chats)
  const conversations = useMemo<Conversation[]>(() => {
    return [...directConversations, ...groupConversations];
  }, [directConversations, groupConversations]);

  // Modal UI state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [viewingStorySequence, setViewingStorySequence] = useState<Story[]>([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<UserProfile | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [followListModal, setFollowListModal] = useState<{
    isOpen: boolean;
    initialTab: 'followers' | 'following';
    targetUser?: UserProfile | null;
  }>({
    isOpen: false,
    initialTab: 'followers',
    targetUser: null,
  });

  // Desktop-only collapsible right sidebar state (default: collapsed, persisted in localStorage)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('orbit_right_sidebar_open');
      return stored === 'true'; // Default is false (collapsed)
    } catch {
      return false;
    }
  });

  const toggleRightSidebar = useCallback(() => {
    setIsRightSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('orbit_right_sidebar_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setRightSidebarOpen = useCallback((open: boolean) => {
    setIsRightSidebarOpen(open);
    try {
      localStorage.setItem('orbit_right_sidebar_open', String(open));
    } catch {
      // ignore
    }
  }, []);

  // Chat workspace mode: 'normal' | 'expanded' | 'fullscreen'
  const [chatWorkspaceMode, setChatWorkspaceMode] = useState<ChatWorkspaceMode>('normal');

  // Real-time typing indicators map: conversationId -> TypingUser[]
  const [typingUsers, setTypingUsers] = useState<Record<string, { uid: string; name: string; username: string; timestamp: number }[]>>({});

  // Toast helper
  const showToast = useCallback(
    (title: string, description?: string, type: 'default' | 'success' | 'alert' = 'default') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setIsAuthReady(true);

      if (user) {
        // User is authenticated with Firebase Auth
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // First time login: Create profile in Firestore
            const baseHandle = (user.email?.split('@')[0] || user.displayName?.toLowerCase().replace(/\s+/g, '_') || 'orbit_member')
              .replace(/[^a-z0-9_]/g, '')
              .slice(0, 20);

            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || 'Orbit Member',
              username: baseHandle || `user_${user.uid.slice(0, 6)}`,
              avatar: user.photoURL || '',
              bio: '',
              interests: ['Design Systems', 'AI & ML'],
              joinedDate: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
              verified: Boolean(user.emailVerified),
              trustLevel: 'Emerging',
              followerCount: 0,
              followingCount: 0,
              profileDiscoverability: 'Public',
              defaultPostVisibility: 'Public',
              directMessageReach: 'Everyone',
              directMessagesReach: 'Everyone',
              likesNotifications: true,
              mentionsNotifications: true,
              followerNotifications: true,
              directMessageNotifications: true,
              storyNotifications: true,
              recommendationNotifications: true,
              notifications: {
                likes: true,
                mentions: true,
                followers: true,
                messages: true,
                storyReplies: true,
                recommendations: true,
                comments: true,
                follows: true,
                storyActivity: true,
              },
              reducedMotion: false,
              compactView: false,
              compactMode: false,
            };

            await saveUserProfile(newProfile);
            await registerUsername(newProfile.username, user.uid);
            profile = newProfile;
          }

          setCurrentUser(profile);
          OrbitStorage.saveUser(profile);
          const userSettings = extractSettingsFromUserProfile(profile, user.email);
          setSettings(userSettings);
          OrbitStorage.saveSettings(userSettings);
        } catch (err) {
          console.error('[ORBIT Auth] Failed to initialize user profile:', err);
        }
      } else {
        // Logged out
        setCurrentUser(null);
        OrbitStorage.saveUser(null);
        setSettings(DEFAULT_SETTINGS);
        OrbitStorage.saveSettings(DEFAULT_SETTINGS);
        setFollowingIds([]);
        setFollowerIds([]);
        setSavedPostIds([]);
        setLikedPostIds([]);
        setRepostedPostIds([]);
        setDirectConversations([]);
        setGroupConversations([]);
        setGroups([]);
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-Time Firestore Synchronization for Public Collections
  useEffect(() => {
    // 2.1 Sync Posts Collection
    const postsUnsub = onSnapshot(
      collection(db, 'posts'),
      (snapshot) => {
        const activePostIds = new Set<string>();
        const remotePosts: Post[] = [];

        snapshot.forEach((docSnap) => {
          const pId = docSnap.id;
          activePostIds.add(pId);
          const data = docSnap.data();
          if (data) {
            const rawCreatedAt = data.createdAt;
            let createdAtStr = new Date().toISOString();
            if (rawCreatedAt) {
              if (typeof rawCreatedAt.toDate === 'function') {
                try {
                  createdAtStr = rawCreatedAt.toDate().toISOString();
                } catch {
                  createdAtStr = new Date().toISOString();
                }
              } else if (typeof rawCreatedAt.toMillis === 'function') {
                createdAtStr = new Date(rawCreatedAt.toMillis()).toISOString();
              } else if (typeof rawCreatedAt === 'object' && typeof rawCreatedAt.seconds === 'number') {
                const ms = rawCreatedAt.seconds * 1000 + (rawCreatedAt.nanoseconds ? Math.floor(rawCreatedAt.nanoseconds / 1000000) : 0);
                createdAtStr = new Date(ms).toISOString();
              } else if (rawCreatedAt instanceof Date) {
                createdAtStr = rawCreatedAt.toISOString();
              } else if (typeof rawCreatedAt === 'number') {
                const ms = rawCreatedAt < 10000000000 ? rawCreatedAt * 1000 : rawCreatedAt;
                createdAtStr = new Date(ms).toISOString();
              } else if (typeof rawCreatedAt === 'string' && rawCreatedAt.trim()) {
                createdAtStr = rawCreatedAt.trim();
              }
            }

            const likes = typeof data.likes === 'number' ? data.likes : (typeof data.likeCount === 'number' ? data.likeCount : 0);
            const reposts = typeof data.reposts === 'number' ? data.reposts : (typeof data.repostCount === 'number' ? data.repostCount : 0);
            
            // Look up cached comments from active subcollection listener or fallback to post doc
            const cachedComments = postCommentsMapRef.current.get(pId) || [];
            const comments = cachedComments.length > 0
              ? cachedComments
              : (Array.isArray(data.comments) ? data.comments : []);
            const commentCount = typeof data.commentCount === 'number'
              ? data.commentCount
              : comments.length;

            const authorUid = data.authorUid || data.authorId || '';
            const authorName = data.displayName || data.authorName || 'Orbit Member';
            const authorUsername = data.username || data.authorUsername || 'member';
            const authorAvatar = data.avatar || data.authorAvatar || '';
            const mediaUrl = data.mediaUrl || data.media || '';
            const mediaUrls = Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0
              ? data.mediaUrls
              : (mediaUrl ? [mediaUrl] : []);
            const storagePaths = Array.isArray(data.storagePaths) && data.storagePaths.length > 0
              ? data.storagePaths
              : (data.storagePath ? [data.storagePath] : []);
            const resolvedMediaType = data.mediaType || (mediaUrls.length > 0 ? 'image' : undefined);

            remotePosts.push({
              id: pId,
              postId: data.postId || pId,
              authorId: authorUid,
              authorUid,
              authorName,
              displayName: authorName,
              authorUsername,
              username: authorUsername,
              authorAvatar,
              avatar: authorAvatar,
              authorVerified: Boolean(data.authorVerified),
              text: data.text || data.content || '',
              media: mediaUrl || (mediaUrls[0] || ''),
              mediaUrl: mediaUrl || (mediaUrls[0] || ''),
              mediaUrls,
              downloadURL: data.downloadURL || mediaUrl || (mediaUrls[0] || ''),
              storagePath: data.storagePath || (storagePaths[0] || undefined),
              storagePaths,
              mediaType: resolvedMediaType,
              mediaName: data.mediaName,
              likes,
              likeCount: likes,
              comments,
              commentCount,
              reposts,
              repostCount: reposts,
              shares: typeof data.shares === 'number' ? data.shares : 0,
              views: typeof data.views === 'number' ? data.views : 0,
              createdAt: createdAtStr,
              visibility: data.visibility || 'Public',
              tags: Array.isArray(data.tags) ? data.tags : ['Orbit'],
            });

            // Attach realtime subcollection listener for post comments if not already listening
            if (!postCommentsUnsubsRef.current.has(pId)) {
              const commentsCol = collection(db, 'posts', pId, 'comments');
              const commentSubUnsub = onSnapshot(
                commentsCol,
                (cSnap) => {
                  const subComments: (PostComment & { _timeMs: number })[] = [];
                  cSnap.forEach((cDoc) => {
                    const cData = cDoc.data();
                    if (cData) {
                      const cCreatedAtRaw = cData.createdAt;
                      let cCreatedAtStr = 'Just now';
                      let cTimeMs = 0;

                      if (cCreatedAtRaw) {
                        if (typeof cCreatedAtRaw.toDate === 'function') {
                          const d = cCreatedAtRaw.toDate();
                          cCreatedAtStr = d.toISOString();
                          cTimeMs = d.getTime();
                        } else if (typeof cCreatedAtRaw.toMillis === 'function') {
                          const ms = cCreatedAtRaw.toMillis();
                          cCreatedAtStr = new Date(ms).toISOString();
                          cTimeMs = ms;
                        } else if (typeof cCreatedAtRaw === 'object' && typeof cCreatedAtRaw.seconds === 'number') {
                          const ms = cCreatedAtRaw.seconds * 1000 + (cCreatedAtRaw.nanoseconds ? Math.floor(cCreatedAtRaw.nanoseconds / 1000000) : 0);
                          cCreatedAtStr = new Date(ms).toISOString();
                          cTimeMs = ms;
                        } else if (cCreatedAtRaw instanceof Date) {
                          cCreatedAtStr = cCreatedAtRaw.toISOString();
                          cTimeMs = cCreatedAtRaw.getTime();
                        } else if (typeof cCreatedAtRaw === 'number') {
                          const ms = cCreatedAtRaw < 10000000000 ? cCreatedAtRaw * 1000 : cCreatedAtRaw;
                          cCreatedAtStr = new Date(ms).toISOString();
                          cTimeMs = ms;
                        } else if (typeof cCreatedAtRaw === 'string' && cCreatedAtRaw.trim()) {
                          cCreatedAtStr = cCreatedAtRaw.trim();
                          const parsed = Date.parse(cCreatedAtStr);
                          cTimeMs = isNaN(parsed) ? 0 : parsed;
                        }
                      }

                      const cAuthorUid = cData.authorUid || cData.authorId || '';
                      const cDisplayName = cData.displayName || cData.authorName || 'Orbit Member';
                      const cUsername = cData.username || cData.authorUsername || 'member';
                      const cAvatar = cData.avatar || cData.authorAvatar || '';

                      subComments.push({
                        id: cDoc.id,
                        commentId: cData.commentId || cDoc.id,
                        postId: cData.postId || pId,
                        authorUid: cAuthorUid,
                        authorId: cAuthorUid,
                        displayName: cDisplayName,
                        authorName: cDisplayName,
                        username: cUsername,
                        authorUsername: cUsername,
                        avatar: cAvatar,
                        authorAvatar: cAvatar,
                        text: cData.text || '',
                        createdAt: cCreatedAtStr,
                        likes: typeof cData.likes === 'number' ? cData.likes : 0,
                        _timeMs: cTimeMs,
                      });
                    }
                  });

                  // 5. Order comments by createdAt ascending
                  subComments.sort((a, b) => {
                    if (a._timeMs === 0 && b._timeMs === 0) return a.id.localeCompare(b.id);
                    if (a._timeMs === 0) return 1;
                    if (b._timeMs === 0) return -1;
                    if (a._timeMs !== b._timeMs) return a._timeMs - b._timeMs;
                    return a.id.localeCompare(b.id);
                  });

                  const cleanComments: PostComment[] = subComments.map(({ _timeMs, ...rest }) => rest);

                  // Update cache
                  postCommentsMapRef.current.set(pId, cleanComments);

                  // Update posts state in realtime
                  setRawPosts((prev) =>
                    prev.map((p) => {
                      if (p.id === pId) {
                        return {
                          ...p,
                          comments: cleanComments,
                          commentCount: Math.max(p.commentCount ?? 0, cleanComments.length),
                        };
                      }
                      return p;
                    })
                  );
                },
                (cErr) => {
                  console.error(`[ORBIT Backend] Comments listener error for post ${pId}:`, cErr);
                }
              );

              postCommentsUnsubsRef.current.set(pId, commentSubUnsub);
            }
          }
        });

        // Clean up unsubscribers for removed posts
        for (const [postIdKey, unsubFn] of postCommentsUnsubsRef.current.entries()) {
          if (!activePostIds.has(postIdKey)) {
            unsubFn();
            postCommentsUnsubsRef.current.delete(postIdKey);
            postCommentsMapRef.current.delete(postIdKey);
          }
        }

        // Sort by creation timestamp (newest first)
        remotePosts.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime() || 0;
          const timeB = new Date(b.createdAt).getTime() || 0;
          return timeB - timeA;
        });
        setRawPosts(remotePosts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'posts');
      }
    );

    // 2.2 Sync Stories Collection with 24h Expiration filter
    const storiesUnsub = onSnapshot(
      collection(db, 'stories'),
      (snapshot) => {
        const nowMs = Date.now();
        const activeStories: Story[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            // Parse createdAt timestamp
            let createdAtIso = new Date().toISOString();
            let createdAtMs = nowMs;
            const rawCreatedAt = data.createdAt;
            if (rawCreatedAt) {
              if (typeof rawCreatedAt.toDate === 'function') {
                const d = rawCreatedAt.toDate();
                createdAtIso = d.toISOString();
                createdAtMs = d.getTime();
              } else if (typeof rawCreatedAt.toMillis === 'function') {
                createdAtMs = rawCreatedAt.toMillis();
                createdAtIso = new Date(createdAtMs).toISOString();
              } else if (typeof rawCreatedAt === 'string') {
                createdAtIso = rawCreatedAt;
                createdAtMs = new Date(rawCreatedAt).getTime() || nowMs;
              } else if (typeof rawCreatedAt === 'number') {
                createdAtMs = rawCreatedAt;
                createdAtIso = new Date(rawCreatedAt).toISOString();
              }
            }

            // Expiration: exactly 24 hours (86,400,000 ms) after createdAt
            let expiresAtMs = createdAtMs + 24 * 60 * 60 * 1000;
            let expiresAtIso = new Date(expiresAtMs).toISOString();
            if (data.expiresAtMs && typeof data.expiresAtMs === 'number') {
              expiresAtMs = data.expiresAtMs;
              expiresAtIso = new Date(expiresAtMs).toISOString();
            } else if (data.expiresAt) {
              if (typeof data.expiresAt.toDate === 'function') {
                const d = data.expiresAt.toDate();
                expiresAtMs = d.getTime();
                expiresAtIso = d.toISOString();
              } else if (typeof data.expiresAt === 'string') {
                expiresAtIso = data.expiresAt;
                const parsed = new Date(data.expiresAt).getTime();
                if (!isNaN(parsed) && parsed > 0) expiresAtMs = parsed;
              }
            }

            // FILTER: strictly exclude deleted or expired stories (where expiresAtMs <= nowMs)
            const isStoryActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
            const isStoryDeleted = Boolean(data.isDeleted) || deletedStoryIdsRef.current.has(docSnap.id) || deletedStoryIdsRef.current.has(data.storyId);
            if (expiresAtMs > nowMs && isStoryActive && !isStoryDeleted) {
              const mediaLink = data.downloadURL || data.mediaUrl || data.media || '';
              const viewersList: string[] = Array.isArray(data.viewers) ? data.viewers : [];
              const reactionsMap: Record<string, string | number> = data.reactions && typeof data.reactions === 'object' ? data.reactions : {};
              const currentUid = authUser?.uid || auth.currentUser?.uid;
              const isViewedByMe = Boolean(data.viewed || (currentUid && viewersList.includes(currentUid)));
              let myReaction: string | undefined = undefined;
              if (currentUid && typeof reactionsMap[currentUid] === 'string') {
                myReaction = reactionsMap[currentUid] as string;
              } else if (data.myReaction) {
                myReaction = data.myReaction;
              }

              activeStories.push({
                id: docSnap.id,
                storyId: data.storyId || docSnap.id,
                authorId: data.authorId || data.authorUid || '',
                authorUid: data.authorUid || data.authorId || '',
                authorName: data.authorName || 'Orbit Member',
                authorUsername: data.authorUsername || 'member',
                authorAvatar: data.authorAvatar || '',
                authorVerified: Boolean(data.authorVerified),
                media: mediaLink,
                mediaUrl: mediaLink,
                downloadURL: data.downloadURL || mediaLink,
                storagePath: data.storagePath || '',
                mediaType: data.mediaType || 'image',
                caption: data.caption || '',
                createdAt: createdAtIso,
                expiresAt: expiresAtIso,
                expiresAtMs,
                viewers: viewersList,
                viewerCount: typeof data.viewerCount === 'number' ? data.viewerCount : viewersList.length,
                reactions: reactionsMap,
                myReaction,
                isDeleted: false,
                isActive: true,
                viewed: isViewedByMe,
              });
            }
          }
        });

        // Sort stories chronologically ascending (oldest to newest within sequence)
        activeStories.sort((a, b) => {
          const timeA = a.expiresAtMs ? a.expiresAtMs - 86400000 : new Date(a.createdAt).getTime() || 0;
          const timeB = b.expiresAtMs ? b.expiresAtMs - 86400000 : new Date(b.createdAt).getTime() || 0;
          return timeA - timeB;
        });

        setStories(activeStories);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'stories');
      }
    );

    // 2.3 Sync Registered Users for Discovery
    const usersUnsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const remoteUsers: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            remoteUsers.push({
              id: data.id || docSnap.id,
              name: data.name || 'Orbit Member',
              username: data.username || 'member',
              avatar: data.avatar || '',
              bio: data.bio || '',
              countryName: data.countryName,
              countryCode: data.countryCode,
              interests: Array.isArray(data.interests) ? data.interests : [],
              joinedDate: data.joinedDate || '',
              verified: Boolean(data.verified),
              trustLevel: data.trustLevel || 'Emerging',
              banner: data.banner || '',
              followerCount: typeof data.followerCount === 'number' ? data.followerCount : (typeof data.followersCount === 'number' ? data.followersCount : 0),
              followersCount: typeof data.followerCount === 'number' ? data.followerCount : (typeof data.followersCount === 'number' ? data.followersCount : 0),
              followingCount: typeof data.followingCount === 'number' ? data.followingCount : 0,
              profileDiscoverability: data.profileDiscoverability,
              defaultPostVisibility: data.defaultPostVisibility,
              directMessagesReach: data.directMessagesReach,
              notifications: data.notifications,
              reducedMotion: data.reducedMotion,
              compactView: data.compactView,
            });
          }
        });
        setAllRegisteredUsers(remoteUsers);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );

    return () => {
      postsUnsub();
      storiesUnsub();
      usersUnsub();
      for (const unsubFn of postCommentsUnsubsRef.current.values()) {
        unsubFn();
      }
      postCommentsUnsubsRef.current.clear();
      postCommentsMapRef.current.clear();
    };
  }, []);

  // 3. User Specific Real-Time Listeners (when authenticated)
  useEffect(() => {
    if (!authUser) return;

    // 3.1 Listen to currentUser document
    const userDocUnsub = onSnapshot(
      doc(db, 'users', authUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setCurrentUser(data);
          OrbitStorage.saveUser(data);
          const userSettings = extractSettingsFromUserProfile(data, authUser.email);
          setSettings(userSettings);
          OrbitStorage.saveSettings(userSettings);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
      }
    );

    // 3.2 Listen to follows collection where followerUid == authUser.uid (creators followed by me)
    const followsQuery = query(
      collection(db, 'follows'),
      where('followerUid', '==', authUser.uid)
    );
    const followsUnsub = onSnapshot(
      followsQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const targetId = data.followingUid || (d.id.includes('_') ? d.id.split('_')[1] : d.id);
          if (targetId && !ids.includes(targetId)) {
            ids.push(targetId);
          }
        });
        setFollowingIds(ids);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'follows');
      }
    );

    // 3.2b Listen to follows collection where followingUid == authUser.uid (users following me)
    const followersQuery = query(
      collection(db, 'follows'),
      where('followingUid', '==', authUser.uid)
    );
    const followersUnsub = onSnapshot(
      followersQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const followerId = data.followerUid || (d.id.includes('_') ? d.id.split('_')[0] : d.id);
          if (followerId && !ids.includes(followerId)) {
            ids.push(followerId);
          }
        });
        setFollowerIds(ids);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'follows');
      }
    );

    // 3.2c Also listen to legacy subcollection for compatibility
    const legacyFollowingUnsub = onSnapshot(
      collection(db, 'users', authUser.uid, 'following'),
      (snapshot) => {
        const legacyIds: string[] = [];
        snapshot.forEach((d) => {
          if (!legacyIds.includes(d.id)) {
            legacyIds.push(d.id);
          }
        });
        if (legacyIds.length > 0) {
          setFollowingIds((prev) => Array.from(new Set([...prev, ...legacyIds])));
        }
      },
      (error) => {
        console.warn('Subcollection following error:', error);
      }
    );

    // 3.3 Listen to savedPosts subcollection in real time
    const savedUnsub = onSnapshot(
      collection(db, 'users', authUser.uid, 'savedPosts'),
      (snapshot) => {
        const records: { postId: string; savedAtTime: number }[] = [];

        snapshot.forEach((d) => {
          const data = d.data();
          const pId = data.postId || d.id;
          let time = 0;
          if (data.savedAt) {
            if (typeof data.savedAt?.toDate === 'function') {
              time = data.savedAt.toDate().getTime();
            } else if (typeof data.savedAt === 'string') {
              time = new Date(data.savedAt).getTime() || 0;
            } else if (typeof data.savedAt === 'number') {
              time = data.savedAt;
            }
          } else if (data.createdAt) {
            if (typeof data.createdAt?.toDate === 'function') {
              time = data.createdAt.toDate().getTime();
            } else if (typeof data.createdAt === 'string') {
              time = new Date(data.createdAt).getTime() || 0;
            }
          }
          if (pId) {
            records.push({ postId: pId, savedAtTime: time });
          }
        });

        // Sort newest saved first
        records.sort((a, b) => b.savedAtTime - a.savedAtTime);
        const sortedIds = records.map((r) => r.postId);

        setSavedPostIds(sortedIds);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}/savedPosts`);
      }
    );

    // 3.4 Listen to user's postLikes collection in real time
    const postLikesQuery = query(
      collection(db, 'postLikes'),
      where('userId', '==', authUser.uid)
    );
    const likedUnsub = onSnapshot(
      postLikesQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const pId = data.postId || (d.id.includes('_') ? d.id.split('_')[0] : d.id);
          if (pId && !ids.includes(pId)) {
            ids.push(pId);
          }
        });
        setLikedPostIds(ids);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'postLikes');
      }
    );

    // 3.5 Listen to user's postReposts collection in real time
    const postRepostsQuery = query(
      collection(db, 'postReposts'),
      where('userId', '==', authUser.uid)
    );
    const repostsUnsub = onSnapshot(
      postRepostsQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const pId = data.postId || (d.id.includes('_') ? d.id.split('_')[0] : d.id);
          if (pId && !ids.includes(pId)) {
            ids.push(pId);
          }
        });
        setRepostedPostIds(ids);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'postReposts');
      }
    );

    // 3.6 Listen to user notifications in real-time
    const notifsQuery = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', authUser.uid)
    );
    const notifsUnsub = onSnapshot(
      notifsQuery,
      (snapshot) => {
        const notifs: OrbitNotification[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const isReadVal = Boolean(data.read !== undefined ? data.read : data.isRead);
          let createdAtStr = 'Just now';
          if (data.createdAt) {
            if (typeof data.createdAt?.toDate === 'function') {
              createdAtStr = data.createdAt.toDate().toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAtStr = data.createdAt;
            }
          }
          const actorUid = data.actorUid || data.actor?.id || '';
          const actorName = data.actorName || data.actor?.name || 'Orbit Member';
          const actorUsername = data.actorUsername || data.actor?.username || 'member';
          const actorAvatar = data.actorAvatar || data.actor?.avatar || '';

          notifs.push({
            id: d.id,
            notificationId: data.notificationId || d.id,
            recipientUid: data.recipientUid || authUser.uid,
            actorUid,
            actorName,
            actorUsername,
            actorAvatar,
            type: (data.type as NotificationType) || 'system',
            targetId: data.targetId || '',
            targetType: data.targetType || 'post',
            text: data.text || '',
            createdAt: createdAtStr,
            read: isReadVal,
            isRead: isReadVal,
            actor: {
              id: actorUid,
              name: actorName,
              username: actorUsername,
              avatar: actorAvatar,
            },
            title: data.title || `${actorName} interacted with your orbit`,
            description: data.description || data.text || '',
          });
        });

        // Sort newest first
        notifs.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime() || 0;
          const timeB = new Date(b.createdAt).getTime() || 0;
          return timeB - timeA;
        });

        setNotifications(notifs);
      },
      (error) => {
        console.warn('[ORBIT] Notifications snapshot listener error:', error);
        handleFirestoreError(error, OperationType.GET, 'notifications');
      }
    );

    // 3.7 Listen to conversations where user is a participant
    const convosQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', authUser.uid)
    );
    const convosUnsub = onSnapshot(
      convosQuery,
      async (snapshot) => {
        const activeIds = new Set<string>();
        const convsMeta: Conversation[] = [];

        for (const d of snapshot.docs) {
          const data = d.data();
          if (!data || !Array.isArray(data.participantIds)) continue;
          activeIds.add(d.id);

          // Find the other participant UID
          const otherUid = data.participantIds.find((id: string) => id !== authUser.uid) || 'unknown';

          // Resolve other participant profile safely
          let otherProfile = allRegisteredUsers.find((u) => u.id === otherUid);
          if (!otherProfile) {
            otherProfile = {
              id: otherUid,
              name: otherUid.startsWith('user_') ? otherUid.replace('user_', '') : 'Orbit Member',
              username: otherUid.startsWith('user_') ? otherUid : `user_${otherUid.slice(0, 6)}`,
              avatar: '',
              bio: '',
              interests: [],
              joinedDate: 'Recent',
              trustLevel: 'Emerging',
            };
            // Enrich profile in background if found in Firestore
            getUserProfile(otherUid).then((fetched) => {
              if (fetched) {
                setDirectConversations((prev) =>
                  prev.map((c) => (c.id === d.id ? { ...c, participant: fetched } : c))
                );
              }
            }).catch(() => {});
          }

          const fallbackMsg: ChatMessage = {
            id: `msg_init_${d.id}`,
            senderId: authUser.uid,
            receiverId: otherUid,
            text: 'Conversation thread initiated',
            createdAt: 'Recent',
            isRead: true,
          };

          const lastMsg = data.lastMessage && typeof data.lastMessage.text === 'string'
            ? data.lastMessage
            : fallbackMsg;

          let updatedAtFormatted = 'Recently';
          if (data.updatedAt) {
            try {
              updatedAtFormatted = new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              updatedAtFormatted = 'Recently';
            }
          }

          const clearedAtIso =
            clearedConversationsMapRef.current[d.id] ||
            (data.clearedAt && data.clearedAt[authUser.uid]) ||
            null;
          const clearedAtMs = clearedAtIso ? new Date(clearedAtIso).getTime() : 0;
          const isHiddenForUser = Boolean(data.hiddenFor && data.hiddenFor[authUser.uid]);

          // Merge any messages already cached in conversationMessagesMapRef or fallback
          const cachedMsgs = conversationMessagesMapRef.current.get(d.id) || [];
          const initialMsgs = normalizeAndSortMessages(
            cachedMsgs.length > 0
              ? cachedMsgs
              : (data.lastMessage ? [data.lastMessage] : []),
            authUser.uid,
            deletedForMeSetRef.current,
            clearedAtMs
          );

          // If all messages were prior to clearedAt and conversation is hidden for this user, do not show conversation
          if (initialMsgs.length === 0 && (clearedAtMs > 0 || isHiddenForUser)) {
            continue;
          }

          const displayLatestMsg = initialMsgs.length > 0 ? initialMsgs[initialMsgs.length - 1] : lastMsg;

          convsMeta.push({
            id: d.id,
            participant: otherProfile,
            lastMessage: displayLatestMsg,
            unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
            messages: initialMsgs.length > 0 ? initialMsgs : [lastMsg],
            updatedAt: updatedAtFormatted,
            participantIds: data.participantIds,
            pinned: Boolean(data.pinned || (data.pinnedBy && data.pinnedBy[authUser.uid])),
            pinnedAt: data.pinnedAt || null,
            pinnedBy: data.pinnedBy || undefined,
          });

          // Attach realtime subcollection listener if not already active
          if (!messageUnsubsRef.current.has(d.id)) {
            const subcollectionQuery = collection(db, 'conversations', d.id, 'messages');
            const subUnsub = onSnapshot(
              subcollectionQuery,
              (msgSnap) => {
                const subMsgs: any[] = [];
                msgSnap.forEach((mDoc) => {
                  const mData = mDoc.data();
                  subMsgs.push({
                    id: mDoc.id,
                    ...mData,
                  });
                });

                const subClearedAtIso =
                  clearedConversationsMapRef.current[d.id] ||
                  (data.clearedAt && data.clearedAt[authUser.uid]) ||
                  null;
                const subClearedAtMs = subClearedAtIso ? new Date(subClearedAtIso).getTime() : 0;
                const subIsHidden = Boolean(data.hiddenFor && data.hiddenFor[authUser.uid]);

                // The messages subcollection is the source of truth, filtered for deletedForMe and clearedAtMs
                const mergedSorted = normalizeAndSortMessages(
                  subMsgs,
                  authUser.uid,
                  deletedForMeSetRef.current,
                  subClearedAtMs
                );

                // Store in persistent ref
                conversationMessagesMapRef.current.set(d.id, mergedSorted);

                if (mergedSorted.length === 0 && (subClearedAtMs > 0 || subIsHidden)) {
                  // Hide conversation for this user if no new messages after clearing
                  setDirectConversations((prev) => prev.filter((c) => c.id !== d.id));
                  return;
                }

                // Update direct conversation state in real-time
                setDirectConversations((prev) =>
                  prev.map((c) => {
                    if (c.id === d.id) {
                      const latestMessage = mergedSorted.length > 0 ? mergedSorted[mergedSorted.length - 1] : undefined;
                      return {
                        ...c,
                        messages: mergedSorted,
                        lastMessage: latestMessage,
                      };
                    }
                    return c;
                  })
                );
              },
              (err) => {
                console.error(`[ORBIT Backend] Messages subcollection error for ${d.id}:`, err);
              }
            );
            messageUnsubsRef.current.set(d.id, subUnsub);
          }
        }

        // Clean up unsubscribers for removed conversations
        for (const [convId, unsubFn] of messageUnsubsRef.current.entries()) {
          if (!activeIds.has(convId)) {
            unsubFn();
            messageUnsubsRef.current.delete(convId);
            conversationMessagesMapRef.current.delete(convId);
          }
        }

        // Update direct conversations metadata while preserving already loaded message streams
        setDirectConversations((prevConvs) => {
          return convsMeta.map((meta) => {
            const existing = prevConvs.find((c) => c.id === meta.id);
            const cached = conversationMessagesMapRef.current.get(meta.id);
            const messagesToKeep = (cached && cached.length > 0)
              ? cached
              : (existing && Array.isArray(existing.messages) && existing.messages.length > 0)
              ? existing.messages
              : meta.messages;
            const latestMsg = messagesToKeep.length > 0 ? messagesToKeep[messagesToKeep.length - 1] : meta.lastMessage;
            return {
              ...meta,
              messages: messagesToKeep,
              lastMessage: latestMsg,
            };
          });
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'conversations');
      }
    );

    // 3.8 Listen to groups collection where user is in members array
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', authUser.uid)
    );
    const groupsUnsub = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const activeGroupIds = new Set<string>();
        const loadedGroups: GroupChat[] = [];

        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (!data || !Array.isArray(data.members)) return;
          activeGroupIds.add(d.id);

          const groupItem: GroupChat = {
            id: d.id,
            name: data.name || 'Orbit Group',
            photoURL: data.photoURL || undefined,
            description: data.description || undefined,
            ownerUid: data.ownerUid || '',
            admins: Array.isArray(data.admins) ? data.admins : [],
            coAdmins: Array.isArray(data.coAdmins) ? data.coAdmins : [],
            members: data.members,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            lastMessage: data.lastMessage || undefined,
            lastMessageAt: data.lastMessageAt || undefined,
            lastSenderUid: data.lastSenderUid || undefined,
            isGroup: true,
          };
          loadedGroups.push(groupItem);

          // Attach realtime subcollection listener if not already active
          if (!groupMessageUnsubsRef.current.has(d.id)) {
            const groupMsgQuery = collection(db, 'groups', d.id, 'messages');
            const subUnsub = onSnapshot(
              groupMsgQuery,
              (msgSnap) => {
                const subMsgs: any[] = [];
                msgSnap.forEach((mDoc) => {
                  const mData = mDoc.data();
                  subMsgs.push({
                    id: mDoc.id,
                    ...mData,
                  });
                });

                const mergedSorted = normalizeAndSortMessages(subMsgs, authUser.uid, deletedForMeSetRef.current);
                groupMessagesMapRef.current.set(d.id, mergedSorted);

                setGroupConversations((prev) =>
                  prev.map((c) => {
                    if (c.id === d.id) {
                      const latestMessage = mergedSorted.length > 0 ? mergedSorted[mergedSorted.length - 1] : undefined;
                      return {
                        ...c,
                        messages: mergedSorted,
                        lastMessage: latestMessage,
                      };
                    }
                    return c;
                  })
                );
              },
              (err) => {
                console.warn(`[ORBIT Backend] Group messages subcollection notification for ${d.id}:`, err?.message || err);
              }
            );
            groupMessageUnsubsRef.current.set(d.id, subUnsub);
          }
        });

        // Clean up unsubscribers for removed groups
        for (const [gId, unsubFn] of groupMessageUnsubsRef.current.entries()) {
          if (!activeGroupIds.has(gId)) {
            unsubFn();
            groupMessageUnsubsRef.current.delete(gId);
            groupMessagesMapRef.current.delete(gId);
          }
        }

        setGroups(loadedGroups);

        // Build group conversations preserving existing message arrays
        setGroupConversations((prevConvs) => {
          return loadedGroups.map((grp) => {
            const cached = groupMessagesMapRef.current.get(grp.id) || [];
            const existingConv = prevConvs.find((c) => c.id === grp.id);
            const prevMsgs = existingConv?.messages || [];
            const activeMsgs = cached.length > 0 ? cached : (prevMsgs.length > 0 ? prevMsgs : []);

            let timeFormatted = 'Recently';
            if (grp.lastMessageAt) {
              try {
                timeFormatted = new Date(grp.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch {
                timeFormatted = 'Recently';
              }
            }

            const fallbackMsg: ChatMessage = {
              id: `msg_grp_init_${grp.id}`,
              senderId: grp.ownerUid,
              receiverId: grp.id,
              text: grp.lastMessage || 'Group created',
              createdAt: timeFormatted,
              isRead: true,
              isSystem: true,
            };
            const latest = activeMsgs.length > 0 ? activeMsgs[activeMsgs.length - 1] : fallbackMsg;

            return {
              id: grp.id,
              isGroup: true,
              group: grp,
              participant: {
                id: grp.id,
                name: grp.name,
                username: `group_${grp.id.slice(0, 8)}`,
                avatar: grp.photoURL || '',
                bio: grp.description || `${grp.members.length} members`,
                interests: [],
                joinedDate: grp.createdAt || 'Recent',
                trustLevel: 'Established',
              },
              participantIds: grp.members,
              lastMessage: latest,
              unreadCount: 0,
              messages: activeMsgs.length > 0 ? activeMsgs : [fallbackMsg],
              updatedAt: timeFormatted,
              pinned: Boolean(existingConv?.pinned),
              pinnedAt: existingConv?.pinnedAt || null,
            };
          });
        });
      },
      (error) => {
        console.warn('[ORBIT] Groups snapshot listener error:', error);
        handleFirestoreError(error, OperationType.GET, 'groups');
      }
    );

    return () => {
      userDocUnsub();
      followsUnsub();
      followersUnsub();
      legacyFollowingUnsub();
      savedUnsub();
      likedUnsub();
      repostsUnsub();
      notifsUnsub();
      convosUnsub();
      groupsUnsub();
      for (const unsubFn of messageUnsubsRef.current.values()) {
        unsubFn();
      }
      messageUnsubsRef.current.clear();
      conversationMessagesMapRef.current.clear();

      for (const unsubFn of groupMessageUnsubsRef.current.values()) {
        unsubFn();
      }
      groupMessageUnsubsRef.current.clear();
      groupMessagesMapRef.current.clear();
    };
  }, [authUser]);

  // Periodic check to auto-expire stories in real-time if they pass 24 hours while app is open
  useEffect(() => {
    const expirationInterval = setInterval(() => {
      const now = Date.now();
      setStories((prev) =>
        prev.filter((story) => {
          let expiresMs = story.expiresAtMs;
          if (!expiresMs && story.expiresAt) {
            expiresMs = new Date(story.expiresAt).getTime();
          }
          if (!expiresMs && story.createdAt) {
            expiresMs = new Date(story.createdAt).getTime() + 86400000;
          }
          return expiresMs ? expiresMs > now : true;
        })
      );
    }, 15000);
    return () => clearInterval(expirationInterval);
  }, []);

  // Auth Operations
  const handleSignInWithGoogle = useCallback(async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        showToast('Authenticated', `Welcome to Orbit, ${user.displayName || 'Member'}.`, 'success');
      }
    } catch (err: unknown) {
      showToast('Sign-In Error', 'Unable to complete Google authentication.', 'alert');
    }
  }, [showToast]);

  const handleSignOut = useCallback(async () => {
    try {
      await logOut();
      setCurrentUser(null);
      OrbitStorage.saveUser(null);
      setSettings(DEFAULT_SETTINGS);
      OrbitStorage.saveSettings(DEFAULT_SETTINGS);
      setFollowingIds([]);
      setSavedPostIds([]);
      setLikedPostIds([]);
      setRepostedPostIds([]);
      setDirectConversations([]);
      setGroupConversations([]);
      setGroups([]);
      setNotifications([]);
      showToast('Signed Out', 'You have been disconnected from Orbit.', 'default');
    } catch (err) {
      showToast('Sign-Out Error', 'Unable to sign out.', 'alert');
    }
  }, [showToast]);

  // Update user profile in Firestore
  const updateCurrentUser = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!currentUser) return;
      // Enforce immutable username rule
      const safeUpdates = { ...updates };
      if (currentUser.username) {
        safeUpdates.username = currentUser.username;
      }
      const updated: UserProfile = { ...currentUser, ...safeUpdates };
      setCurrentUser(updated);
      OrbitStorage.saveUser(updated);

      if (authUser) {
        try {
          await saveUserProfile(updated);
          showToast('Profile updated', 'Your orbit identity has been synchronized.', 'success');
        } catch (err) {
          showToast('Sync Error', 'Profile update encountered an error.', 'alert');
        }
      }
    },
    [currentUser, authUser, showToast]
  );

  // All registered users list for discovery & profiles
  const allUsers = useMemo(() => {
    if (allRegisteredUsers.length > 0) {
      if (currentUser) {
        const exists = allRegisteredUsers.some((u) => u.id === currentUser.id);
        return exists ? allRegisteredUsers : [currentUser, ...allRegisteredUsers];
      }
      return allRegisteredUsers;
    }
    return currentUser ? [currentUser] : [];
  }, [currentUser, allRegisteredUsers]);

  const getUserById = useCallback(
    (id: string) => {
      if (currentUser && id === currentUser.id) return currentUser;
      return allUsers.find((u) => u.id === id);
    },
    [currentUser, allUsers]
  );

  // Central Notification Dispatcher
  const createNotification = useCallback(
    async (params: {
      recipientUid: string;
      type: NotificationType;
      targetId: string;
      targetType: 'user' | 'post' | 'comment' | 'story' | 'conversation' | 'message';
      text?: string;
    }) => {
      if (!currentUser || !params.recipientUid) return;
      // Do not create notifications for actions performed on own content
      if (
        params.recipientUid === currentUser.id ||
        (authUser && params.recipientUid === authUser.uid)
      ) {
        return;
      }

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const notifData = {
        id: notifId,
        notificationId: notifId,
        recipientUid: params.recipientUid,
        actorUid: currentUser.id,
        actorName: currentUser.name,
        actorUsername: currentUser.username,
        actorAvatar: currentUser.avatar || '',
        type: params.type,
        targetId: params.targetId,
        targetType: params.targetType,
        text: params.text || '',
        read: false,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      if (authUser) {
        try {
          await setDoc(doc(db, 'notifications', notifId), sanitizeFirestoreData(notifData));
        } catch (err) {
          console.warn('[ORBIT Notification] Failed to persist notification in Firestore:', err);
        }
      }
    },
    [currentUser, authUser]
  );

  // Follow actions
  const followUser = useCallback(
    async (userId: string) => {
      if (!userId) return;
      if (authUser && authUser.uid === userId) return;

      setFollowingIds((prev) => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });

      // Automatically dispatch follow notification
      createNotification({
        recipientUid: userId,
        type: 'follow',
        targetId: currentUser?.id || authUser?.uid || '',
        targetType: 'user',
      });

      if (authUser) {
        const followerUid = authUser.uid;
        const followingUid = userId;
        const followDocId = `${followerUid}_${followingUid}`;
        const followRef = doc(db, 'follows', followDocId);
        const followerUserRef = doc(db, 'users', followerUid);
        const followingUserRef = doc(db, 'users', followingUid);
        const legacyFollowingRef = doc(db, 'users', followerUid, 'following', followingUid);

        try {
          await runTransaction(db, async (transaction) => {
            const followSnap = await transaction.get(followRef);
            // Prevent duplicate follow documents between the same two users
            if (followSnap.exists()) {
              return;
            }

            const followerUserSnap = await transaction.get(followerUserRef);
            const followingUserSnap = await transaction.get(followingUserRef);

            const nowIso = new Date().toISOString();
            // 1. Store one follow relationship per document containing followerUid, followingUid, createdAt
            transaction.set(followRef, {
              followerUid,
              followingUid,
              createdAt: nowIso,
            });

            // Maintain legacy subcollection
            transaction.set(legacyFollowingRef, {
              targetUserId: followingUid,
              createdAt: nowIso,
            });

            // 2. Atomic increments
            if (followerUserSnap.exists()) {
              const currentFollowing = typeof followerUserSnap.data()?.followingCount === 'number'
                ? followerUserSnap.data().followingCount
                : 0;
              transaction.update(followerUserRef, {
                followingCount: currentFollowing + 1,
              });
            }

            if (followingUserSnap.exists()) {
              const currentFollowers = typeof followingUserSnap.data()?.followerCount === 'number'
                ? followingUserSnap.data().followerCount
                : 0;
              transaction.update(followingUserRef, {
                followerCount: currentFollowers + 1,
              });
            }
          });
        } catch (err) {
          console.error('[ORBIT Follow Error]:', err);
          setFollowingIds((prev) => prev.filter((id) => id !== userId));
          handleFirestoreError(err, OperationType.WRITE, `follows/${followDocId}`);
          return;
        }
      }

      const targetUser = allUsers.find((u) => u.id === userId);
      showToast(
        'Orbit Locked',
        targetUser ? `Connected to @${targetUser.username}'s frequency.` : 'Added to following.'
      );
    },
    [authUser, currentUser, allUsers, showToast, createNotification]
  );

  const unfollowUser = useCallback(
    async (userId: string) => {
      if (!userId) return;

      setFollowingIds((prev) => prev.filter((id) => id !== userId));

      if (authUser) {
        const followerUid = authUser.uid;
        const followingUid = userId;
        const followDocId = `${followerUid}_${followingUid}`;
        const followRef = doc(db, 'follows', followDocId);
        const followerUserRef = doc(db, 'users', followerUid);
        const followingUserRef = doc(db, 'users', followingUid);
        const legacyFollowingRef = doc(db, 'users', followerUid, 'following', followingUid);

        try {
          await runTransaction(db, async (transaction) => {
            const followSnap = await transaction.get(followRef);
            const legacySnap = await transaction.get(legacyFollowingRef);

            if (!followSnap.exists() && !legacySnap.exists()) {
              return;
            }

            const followerUserSnap = await transaction.get(followerUserRef);
            const followingUserSnap = await transaction.get(followingUserRef);

            if (followSnap.exists()) {
              transaction.delete(followRef);
            }
            if (legacySnap.exists()) {
              transaction.delete(legacyFollowingRef);
            }

            // Decrement follower and following counts atomically (clamped to 0)
            if (followerUserSnap.exists()) {
              const currentFollowing = typeof followerUserSnap.data()?.followingCount === 'number'
                ? followerUserSnap.data().followingCount
                : 1;
              transaction.update(followerUserRef, {
                followingCount: Math.max(0, currentFollowing - 1),
              });
            }

            if (followingUserSnap.exists()) {
              const currentFollowers = typeof followingUserSnap.data()?.followerCount === 'number'
                ? followingUserSnap.data().followerCount
                : 1;
              transaction.update(followingUserRef, {
                followerCount: Math.max(0, currentFollowers - 1),
              });
            }
          });
        } catch (err) {
          console.error('[ORBIT Unfollow Error]:', err);
          setFollowingIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
          handleFirestoreError(err, OperationType.DELETE, `follows/${followDocId}`);
          return;
        }
      }

      showToast('Disconnected', 'Removed from your following orbit.');
    },
    [authUser, showToast]
  );

  const isFollowing = useCallback(
    (userId: string) => {
      return followingIds.includes(userId);
    },
    [followingIds]
  );

  // Post actions
  const createPost = useCallback(
    async (content: {
      text: string;
      media?: string;
      mediaUrl?: string;
      mediaUrls?: string[];
      downloadURL?: string;
      storagePath?: string;
      storagePaths?: string[];
      mediaType?: 'text' | 'image' | 'video';
      mediaName?: string;
      visibility: VisibilityType;
      tags?: string[];
    }) => {
      if (!currentUser) {
        showToast('Authentication Required', 'Please sign in to publish a post.', 'alert');
        return undefined;
      }

      const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();

      const mediaUrls = Array.isArray(content.mediaUrls) && content.mediaUrls.length > 0
        ? content.mediaUrls.filter((u) => u && !u.startsWith('blob:'))
        : (content.downloadURL || content.mediaUrl || content.media ? [content.downloadURL || content.mediaUrl || content.media!].filter((u) => u && !u.startsWith('blob:')) : []);

      const storagePaths = Array.isArray(content.storagePaths) && content.storagePaths.length > 0
        ? content.storagePaths
        : (content.storagePath ? [content.storagePath] : []);

      const resolvedMediaUrl = mediaUrls[0] || '';
      const resolvedMediaType = content.mediaType || (mediaUrls.length > 0 ? 'image' : 'text');

      const newPost: Post = {
        id: postId,
        postId,
        authorId: currentUser.id,
        authorUid: currentUser.id,
        authorName: currentUser.name,
        displayName: currentUser.name,
        authorUsername: currentUser.username,
        username: currentUser.username,
        authorAvatar: currentUser.avatar || '',
        avatar: currentUser.avatar || '',
        authorVerified: Boolean(currentUser.verified),
        text: content.text.trim(),
        media: resolvedMediaUrl || undefined,
        mediaUrl: resolvedMediaUrl || undefined,
        mediaUrls,
        downloadURL: resolvedMediaUrl || undefined,
        storagePath: storagePaths[0] || content.storagePath,
        storagePaths,
        mediaType: resolvedMediaType,
        mediaName: content.mediaName,
        visibility: content.visibility || 'Public',
        createdAt: nowIso,
        likes: 0,
        likeCount: 0,
        likedByMe: false,
        comments: [],
        commentCount: 0,
        reposts: 0,
        repostCount: 0,
        repostedByMe: false,
        savedByMe: false,
        views: 1,
        shares: 0,
        tags: content.tags || ['Orbit'],
      };

      // Optimistic local update so Home timeline receives the post immediately
      setRawPosts((prev) => [newPost, ...prev.filter((p) => p.id !== postId)]);

      // Remote Firestore sync if authenticated
      if (authUser) {
        try {
          const firestoreDoc: Record<string, any> = {
            postId,
            id: postId,
            authorUid: currentUser.id,
            authorId: currentUser.id,
            username: currentUser.username.toLowerCase(),
            authorUsername: currentUser.username.toLowerCase(),
            displayName: currentUser.name,
            authorName: currentUser.name,
            avatar: currentUser.avatar || '',
            authorAvatar: currentUser.avatar || '',
            authorVerified: Boolean(currentUser.verified),
            text: content.text.trim(),
            visibility: content.visibility || 'Public',
            likeCount: 0,
            likes: 0,
            repostCount: 0,
            reposts: 0,
            commentCount: 0,
            comments: [],
            views: 1,
            shares: 0,
            tags: content.tags || ['Orbit'],
            mediaUrls,
            storagePaths,
            mediaType: resolvedMediaType,
            createdAt: serverTimestamp(),
          };

          if (resolvedMediaUrl) {
            firestoreDoc.media = resolvedMediaUrl;
            firestoreDoc.mediaUrl = resolvedMediaUrl;
            firestoreDoc.downloadURL = resolvedMediaUrl;
          }
          if (storagePaths.length > 0) {
            firestoreDoc.storagePath = storagePaths[0];
          }
          if (content.mediaName) {
            firestoreDoc.mediaName = content.mediaName;
          }

          await setDoc(doc(db, 'posts', postId), sanitizeFirestoreData(firestoreDoc));
        } catch (err: any) {
          console.error('[ORBIT Backend] Failed to sync post to Firestore:', err);
          // Rollback optimistic update
          setRawPosts((prev) => prev.filter((p) => p.id !== postId));

          // Cleanup storage files if Firestore write fails to prevent orphaned files
          if (storagePaths.length > 0) {
            Promise.all(storagePaths.map((sp) => deleteMediaFile(sp).catch(() => {})));
          }

          const errorMessage = err?.message?.includes('permission-denied') || err?.message?.includes('Permission denied')
            ? 'Permission error: unable to publish post.'
            : 'Failed to publish post. Please check your network connection and try again.';
          showToast('Publishing Failed', errorMessage, 'alert');
          throw err;
        }
      }

      showToast('Signal Published', 'Your transmission is now moving through the orbit.', 'success');
      return newPost;
    },
    [currentUser, authUser, showToast]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      const targetPost = rawPosts.find((p) => p.id === postId);
      setRawPosts((prev) => prev.filter((p) => p.id !== postId));

      if (authUser) {
        try {
          await deleteDoc(doc(db, 'posts', postId));
          const pathsToDelete = [
            ...(targetPost?.storagePaths || []),
            targetPost?.storagePath,
            targetPost?.downloadURL,
            targetPost?.mediaUrl,
            targetPost?.media,
          ].filter(Boolean) as string[];

          await Promise.all(pathsToDelete.map((p) => deleteMediaFile(p)));
        } catch (err) {
          console.error('[ORBIT Backend] Failed to delete post in Firestore:', err);
          handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
        }
      }

      showToast('Transmission Deleted', 'Post has been removed from Orbit.');
    },
    [authUser, rawPosts, showToast]
  );

  const toggleLikePost = useCallback(
    async (postId: string) => {
      if (!postId) return;
      const isCurrentlyLiked = likedPostIds.includes(postId);
      const nextLiked = !isCurrentlyLiked;

      // 1. Optimistic UI update
      setLikedPostIds((prev) =>
        nextLiked ? (prev.includes(postId) ? prev : [...prev, postId]) : prev.filter((id) => id !== postId)
      );
      setRawPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const curLikes = typeof p.likeCount === 'number' ? p.likeCount : (typeof p.likes === 'number' ? p.likes : 0);
            const nextLikes = nextLiked ? curLikes + 1 : Math.max(0, curLikes - 1);
            return {
              ...p,
              likes: nextLikes,
              likeCount: nextLikes,
            };
          }
          return p;
        })
      );

      // Dispatch like notification automatically
      if (nextLiked) {
        const targetPost = rawPosts.find((p) => p.id === postId);
        const postAuthorId = targetPost?.authorId || targetPost?.authorUid;
        if (postAuthorId && postAuthorId !== currentUser?.id) {
          createNotification({
            recipientUid: postAuthorId,
            type: 'like',
            targetId: postId,
            targetType: 'post',
            text: targetPost?.text ? (targetPost.text.length > 50 ? targetPost.text.slice(0, 50) + '...' : targetPost.text) : '',
          });
        }
      }

      // 2. Synchronize with Firestore transaction
      if (authUser) {
        try {
          const likeDocId = `${postId}_${authUser.uid}`;
          const postRef = doc(db, 'posts', postId);
          const postLikeDocRef = doc(db, 'postLikes', likeDocId);
          const userLikeSubRef = doc(db, 'users', authUser.uid, 'likedPosts', postId);
          const postLikeSubRef = doc(db, 'posts', postId, 'likes', authUser.uid);

          await runTransaction(db, async (transaction) => {
            const postSnap = await transaction.get(postRef);
            if (!postSnap.exists()) {
              throw new Error('Post does not exist');
            }

            const postLikeSnap = await transaction.get(postLikeDocRef);
            const userAlreadyLiked = postLikeSnap.exists();
            const postData = postSnap.data();
            const currentLikes = typeof postData.likeCount === 'number'
              ? postData.likeCount
              : (typeof postData.likes === 'number' ? postData.likes : 0);

            if (userAlreadyLiked) {
              transaction.delete(postLikeDocRef);
              transaction.delete(userLikeSubRef);
              transaction.delete(postLikeSubRef);
              const updatedLikes = Math.max(0, currentLikes - 1);
              transaction.update(postRef, {
                likes: updatedLikes,
                likeCount: updatedLikes,
              });
            } else {
              const nowIso = new Date().toISOString();
              transaction.set(postLikeDocRef, {
                id: likeDocId,
                postId,
                userId: authUser.uid,
                userUid: authUser.uid,
                createdAt: nowIso,
              });
              transaction.set(userLikeSubRef, {
                postId,
                createdAt: nowIso,
              });
              transaction.set(postLikeSubRef, {
                userId: authUser.uid,
                createdAt: nowIso,
              });
              const updatedLikes = currentLikes + 1;
              transaction.update(postRef, {
                likes: updatedLikes,
                likeCount: updatedLikes,
              });
            }
          });
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync like transaction to Firestore:', err);
          handleFirestoreError(err, OperationType.WRITE, `posts/${postId}`);
          // Rollback optimistic state
          setLikedPostIds((prev) =>
            isCurrentlyLiked ? (prev.includes(postId) ? prev : [...prev, postId]) : prev.filter((id) => id !== postId)
          );
          setRawPosts((prev) =>
            prev.map((p) => {
              if (p.id === postId) {
                const curLikes = typeof p.likeCount === 'number' ? p.likeCount : (typeof p.likes === 'number' ? p.likes : 0);
                const rolledLikes = isCurrentlyLiked ? curLikes + 1 : Math.max(0, curLikes - 1);
                return {
                  ...p,
                  likes: rolledLikes,
                  likeCount: rolledLikes,
                };
              }
              return p;
            })
          );
        }
      }
    },
    [likedPostIds, authUser, rawPosts, currentUser, createNotification]
  );

  const toggleSavePost = useCallback(
    async (postId: string) => {
      if (!postId) return;
      const isSaved = savedPostIds.includes(postId);
      const nextSaved = !isSaved;

      // 1. Instant optimistic UI update (newest saved at top)
      setSavedPostIds((prev) =>
        nextSaved ? [postId, ...prev.filter((id) => id !== postId)] : prev.filter((id) => id !== postId)
      );

      // 2. Synchronize with Firestore
      if (authUser) {
        try {
          if (isSaved) {
            await deleteDoc(doc(db, 'users', authUser.uid, 'savedPosts', postId));
          } else {
            await setDoc(doc(db, 'users', authUser.uid, 'savedPosts', postId), {
              postId,
              savedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync saved post to Firestore:', err);
          // Rollback on failure
          setSavedPostIds((prev) =>
            isSaved ? [postId, ...prev.filter((id) => id !== postId)] : prev.filter((id) => id !== postId)
          );
          showToast('Sync Error', 'Could not update bookmark. Please try again.', 'alert');
          return;
        }
      }

      showToast(
        nextSaved ? 'Post Saved' : 'Bookmark Removed',
        nextSaved ? 'Saved to your private archive.' : 'Removed from saved collection.',
        'success'
      );
    },
    [savedPostIds, authUser, showToast]
  );

  const toggleRepost = useCallback(
    async (postId: string) => {
      if (!postId) return;
      const isCurrentlyReposted = repostedPostIds.includes(postId);
      const nextReposted = !isCurrentlyReposted;

      // 1. Optimistic UI update
      setRepostedPostIds((prev) =>
        nextReposted ? (prev.includes(postId) ? prev : [...prev, postId]) : prev.filter((id) => id !== postId)
      );
      setRawPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const curReposts = typeof p.repostCount === 'number' ? p.repostCount : (typeof p.reposts === 'number' ? p.reposts : 0);
            const nextReposts = nextReposted ? curReposts + 1 : Math.max(0, curReposts - 1);
            return {
              ...p,
              reposts: nextReposts,
              repostCount: nextReposts,
            };
          }
          return p;
        })
      );

      showToast(
        nextReposted ? 'Resonated' : 'Repost Removed',
        nextReposted ? 'Signal rebroadcasted to your orbit.' : 'Removed from your reposts.'
      );

      // 2. Synchronize with Firestore transaction
      if (authUser) {
        try {
          const repostDocId = `${postId}_${authUser.uid}`;
          const postRef = doc(db, 'posts', postId);
          const postRepostDocRef = doc(db, 'postReposts', repostDocId);
          const userRepostSubRef = doc(db, 'users', authUser.uid, 'reposts', postId);
          const postRepostSubRef = doc(db, 'posts', postId, 'reposts', authUser.uid);

          await runTransaction(db, async (transaction) => {
            const postSnap = await transaction.get(postRef);
            if (!postSnap.exists()) {
              throw new Error('Post does not exist');
            }

            const postRepostSnap = await transaction.get(postRepostDocRef);
            const userAlreadyReposted = postRepostSnap.exists();
            const postData = postSnap.data();
            const currentReposts = typeof postData.repostCount === 'number'
              ? postData.repostCount
              : (typeof postData.reposts === 'number' ? postData.reposts : 0);

            if (userAlreadyReposted) {
              transaction.delete(postRepostDocRef);
              transaction.delete(userRepostSubRef);
              transaction.delete(postRepostSubRef);
              const updatedReposts = Math.max(0, currentReposts - 1);
              transaction.update(postRef, {
                reposts: updatedReposts,
                repostCount: updatedReposts,
              });
            } else {
              const nowIso = new Date().toISOString();
              transaction.set(postRepostDocRef, {
                id: repostDocId,
                postId,
                userId: authUser.uid,
                userUid: authUser.uid,
                createdAt: nowIso,
              });
              transaction.set(userRepostSubRef, {
                postId,
                createdAt: nowIso,
              });
              transaction.set(postRepostSubRef, {
                userId: authUser.uid,
                createdAt: nowIso,
              });
              const updatedReposts = currentReposts + 1;
              transaction.update(postRef, {
                reposts: updatedReposts,
                repostCount: updatedReposts,
              });
            }
          });
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync repost transaction to Firestore:', err);
          handleFirestoreError(err, OperationType.WRITE, `posts/${postId}`);
          // Rollback on error
          setRepostedPostIds((prev) =>
            isCurrentlyReposted ? (prev.includes(postId) ? prev : [...prev, postId]) : prev.filter((id) => id !== postId)
          );
          setRawPosts((prev) =>
            prev.map((p) => {
              if (p.id === postId) {
                const curReposts = typeof p.repostCount === 'number' ? p.repostCount : (typeof p.reposts === 'number' ? p.reposts : 0);
                const rolledReposts = isCurrentlyReposted ? curReposts + 1 : Math.max(0, curReposts - 1);
                return {
                  ...p,
                  reposts: rolledReposts,
                  repostCount: rolledReposts,
                };
              }
              return p;
            })
          );
        }
      }
    },
    [repostedPostIds, authUser, showToast]
  );

  const addComment = useCallback(
    async (postId: string, text: string) => {
      if (!currentUser || !text.trim() || !postId) return;

      const trimmedText = text.trim();
      const commentId = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const optimisticComment: PostComment = {
        id: commentId,
        commentId,
        postId,
        authorUid: currentUser.id,
        authorId: currentUser.id,
        displayName: currentUser.name,
        authorName: currentUser.name,
        username: currentUser.username,
        authorUsername: currentUser.username,
        avatar: currentUser.avatar,
        authorAvatar: currentUser.avatar,
        text: trimmedText,
        createdAt: 'Just now',
        likes: 0,
      };

      // Retrieve previous state for fallback/rollback
      const cached = postCommentsMapRef.current.get(postId) || [];
      const prevComments = cached.length > 0
        ? cached
        : (rawPosts.find((p) => p.id === postId)?.comments || []);
      const prevCount = rawPosts.find((p) => p.id === postId)?.commentCount ?? prevComments.length;

      // 1. Optimistic state update
      const nextComments = [...prevComments, optimisticComment];
      postCommentsMapRef.current.set(postId, nextComments);
      setRawPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: nextComments,
              commentCount: prevCount + 1,
            };
          }
          return p;
        })
      );

      // Automatically dispatch comment notification
      const targetPost = rawPosts.find((p) => p.id === postId) || posts.find((p) => p.id === postId);
      const postAuthorId = targetPost?.authorId || targetPost?.authorUid;
      if (postAuthorId && postAuthorId !== currentUser.id) {
        createNotification({
          recipientUid: postAuthorId,
          type: 'comment',
          targetId: postId,
          targetType: 'post',
          text: trimmedText,
        });
      }

      // 2. Persist atomically to Firestore
      if (authUser) {
        try {
          const commentRef = doc(db, 'posts', postId, 'comments', commentId);
          const postRef = doc(db, 'posts', postId);

          const commentData = {
            commentId,
            postId,
            authorUid: authUser.uid,
            username: currentUser.username,
            displayName: currentUser.name,
            avatar: currentUser.avatar || '',
            text: trimmedText,
            createdAt: serverTimestamp(),
            // Backwards compatibility aliases
            id: commentId,
            authorId: authUser.uid,
            authorUsername: currentUser.username,
            authorName: currentUser.name,
            authorAvatar: currentUser.avatar || '',
            likes: 0,
          };

          const batch = writeBatch(db);
          batch.set(commentRef, sanitizeFirestoreData(commentData));
          batch.update(postRef, {
            commentCount: increment(1),
          });
          await batch.commit();

          showToast('Reply Transmitted', 'Your comment was posted to the signal thread.', 'success');
        } catch (err: any) {
          console.error('[ORBIT Backend] Failed to sync comment to Firestore:', err);
          // Rollback optimistic state
          postCommentsMapRef.current.set(postId, prevComments);
          setRawPosts((prev) =>
            prev.map((p) => {
              if (p.id === postId) {
                return {
                  ...p,
                  comments: prevComments,
                  commentCount: prevCount,
                };
              }
              return p;
            })
          );
          const errorMessage = err?.message?.includes('permission-denied') || err?.message?.includes('Permission denied')
            ? 'Permission error: unable to post reply.'
            : 'Failed to post reply. Please check your connection and try again.';
          showToast('Reply Failed', errorMessage, 'alert');
          handleFirestoreError(err, OperationType.CREATE, `posts/${postId}/comments/${commentId}`);
        }
      } else {
        showToast('Reply Transmitted', 'Your comment was posted locally.', 'success');
      }
    },
    [currentUser, authUser, showToast, rawPosts, posts, createNotification]
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      if (!currentUser || !postId || !commentId) return;

      const cached = postCommentsMapRef.current.get(postId) || [];
      const prevComments = cached.length > 0
        ? cached
        : (rawPosts.find((p) => p.id === postId)?.comments || []);
      const prevCount = rawPosts.find((p) => p.id === postId)?.commentCount ?? prevComments.length;

      // Ownership authorization check
      const targetComment = prevComments.find((c) => c.id === commentId || c.commentId === commentId);
      if (targetComment && targetComment.authorUid !== currentUser.id && targetComment.authorId !== currentUser.id) {
        showToast('Unauthorized', 'You can only delete replies you authored.', 'alert');
        return;
      }

      // 1. Optimistic removal
      const nextComments = prevComments.filter((c) => c.id !== commentId && c.commentId !== commentId);
      const nextCount = Math.max(0, prevCount - 1);
      postCommentsMapRef.current.set(postId, nextComments);
      setRawPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: nextComments,
              commentCount: nextCount,
            };
          }
          return p;
        })
      );

      // 2. Persist deletion atomically to Firestore
      if (authUser) {
        try {
          const commentRef = doc(db, 'posts', postId, 'comments', commentId);
          const postRef = doc(db, 'posts', postId);

          const batch = writeBatch(db);
          batch.delete(commentRef);
          batch.update(postRef, {
            commentCount: increment(-1),
          });
          await batch.commit();

          showToast('Reply Deleted', 'Comment removed from thread.');
        } catch (err: any) {
          console.error('[ORBIT Backend] Failed to delete comment in Firestore:', err);
          // Rollback optimistic state
          postCommentsMapRef.current.set(postId, prevComments);
          setRawPosts((prev) =>
            prev.map((p) => {
              if (p.id === postId) {
                return {
                  ...p,
                  comments: prevComments,
                  commentCount: prevCount,
                };
              }
              return p;
            })
          );
          const errorMessage = err?.message?.includes('permission-denied') || err?.message?.includes('Permission denied')
            ? 'Permission error: unable to delete reply.'
            : 'Failed to delete reply. Please try again.';
          showToast('Delete Failed', errorMessage, 'alert');
          handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
        }
      }
    },
    [currentUser, authUser, showToast, rawPosts]
  );

  // Story actions
  const addStory = useCallback(
    async (data: {
      storyId?: string;
      media: string;
      mediaType: 'image' | 'video';
      downloadURL?: string;
      storagePath?: string;
      caption?: string;
    }) => {
      if (!currentUser) return undefined;

      const storyId = data.storyId || `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nowMs = Date.now();
      const expiresAtMs = nowMs + 24 * 60 * 60 * 1000;
      const nowIso = new Date(nowMs).toISOString();
      const expiresAtIso = new Date(expiresAtMs).toISOString();
      const mediaLink = data.downloadURL || data.media;

      const newStory: Story = {
        id: storyId,
        storyId: storyId,
        authorId: currentUser.id,
        authorUid: currentUser.id,
        authorName: currentUser.name || 'Orbit Member',
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatar || '',
        authorVerified: Boolean(currentUser.verified),
        media: mediaLink,
        mediaUrl: mediaLink,
        downloadURL: data.downloadURL || mediaLink,
        storagePath: data.storagePath || '',
        mediaType: data.mediaType,
        caption: data.caption,
        createdAt: nowIso,
        expiresAt: expiresAtIso,
        expiresAtMs,
        viewers: [],
        viewerCount: 0,
        reactions: {},
        isDeleted: false,
        isActive: true,
        viewed: false,
      };

      // 1. Optimistic append
      setStories((prev) => [...prev.filter((s) => s.id !== storyId), newStory]);

      // 2. Persist to Firestore with serverTimestamp()
      if (authUser) {
        try {
          console.log('[ORBIT Story Pipeline] Writing Firestore document:', {
            storyId,
            authorUid: currentUser.id,
            mediaUrl: mediaLink,
            storagePath: data.storagePath,
          });

          const firestoreStoryDoc: Record<string, any> = {
            id: storyId,
            storyId: storyId,
            authorId: currentUser.id,
            authorUid: currentUser.id,
            authorName: currentUser.name || 'Orbit Member',
            authorUsername: (currentUser.username || 'member').toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
            authorAvatar: currentUser.avatar || '',
            authorVerified: Boolean(currentUser.verified),
            media: mediaLink,
            mediaUrl: mediaLink,
            downloadURL: data.downloadURL || mediaLink,
            storagePath: data.storagePath || '',
            mediaType: data.mediaType,
            caption: data.caption || '',
            createdAt: serverTimestamp(),
            expiresAt: expiresAtIso,
            expiresAtMs,
            viewers: [],
            reactions: {},
            isDeleted: false,
            isActive: true,
            viewed: false,
          };

          await setDoc(doc(db, 'stories', storyId), sanitizeFirestoreData(firestoreStoryDoc));
          console.log('[ORBIT Story Pipeline] Firestore success:', storyId);
        } catch (err: any) {
          console.error('[ORBIT Story Pipeline] Firestore write threw an exception:', {
            code: err?.code,
            message: err?.message,
            stack: err?.stack,
            error: err,
          });
          // Rollback optimistic state on failure
          setStories((prev) => prev.filter((s) => s.id !== storyId));
          
          // Delete uploaded storage file to prevent orphaned storage media
          if (data.storagePath) {
            try {
              console.log('[ORBIT Story Pipeline] Deleting storage object after Firestore failure:', data.storagePath);
              await deleteMediaFile(data.storagePath);
            } catch (cleanErr) {
              console.warn('[ORBIT Storage] Failed to clean up orphaned storage file after Firestore failure:', cleanErr);
            }
          }

          const errorMessage = err?.message?.includes('permission-denied') || err?.message?.includes('Permission denied')
            ? 'Permission error: unable to broadcast story.'
            : 'Unable to upload story. Please try again.';
          showToast('Broadcast Failed', errorMessage, 'alert');
          handleFirestoreError(err, OperationType.CREATE, `stories/${storyId}`);
          throw err;
        }
      }

      showToast('Story Broadcasted', 'Your 24h visual transmission is live.', 'success');
      return newStory;
    },
    [currentUser, authUser, showToast]
  );

  const deleteStory = useCallback(
    async (storyId: string) => {
      if (!currentUser || !storyId) return;

      const targetStory = stories.find((s) => s.id === storyId || s.storyId === storyId);
      const currentUid = authUser?.uid || currentUser.id;
      if (targetStory) {
        const isAuthor =
          targetStory.authorId === currentUid ||
          targetStory.authorUid === currentUid ||
          targetStory.authorId === currentUser.id ||
          targetStory.authorUid === currentUser.id;
        if (!isAuthor) {
          showToast('Unauthorized', 'You can only delete stories you authored.', 'alert');
          return;
        }
      }

      // 1. Add to permanent deleted stories set
      deletedStoryIdsRef.current.add(storyId);
      try {
        localStorage.setItem(
          'orbit_deleted_story_ids',
          JSON.stringify(Array.from(deletedStoryIdsRef.current))
        );
      } catch {}

      // 2. Optimistic removal from stories and active sequence
      setStories((prev) => prev.filter((s) => s.id !== storyId && s.storyId !== storyId));

      setViewingStorySequence((prevSeq) => {
        const nextSeq = prevSeq.filter((s) => s.id !== storyId && s.storyId !== storyId);
        if (nextSeq.length === 0) {
          setViewingStory(null);
        } else {
          setViewingStory((curr) => {
            if (curr && (curr.id === storyId || curr.storyId === storyId)) {
              return nextSeq[0] || null;
            }
            return curr;
          });
        }
        return nextSeq;
      });

      // 3. Persist deletion in Storage and Firestore
      if (authUser) {
        try {
          // Soft-mark first so all active listeners update immediately
          await updateDoc(doc(db, 'stories', storyId), {
            isDeleted: true,
            isActive: false,
            deletedAt: serverTimestamp(),
          }).catch(() => {});

          // Clean up storage media file safely
          const targetMedia =
            targetStory?.storagePath ||
            targetStory?.downloadURL ||
            targetStory?.mediaUrl ||
            targetStory?.media;
          if (
            targetMedia &&
            typeof targetMedia === 'string' &&
            (targetMedia.includes('firebasestorage.googleapis.com') || !targetMedia.startsWith('http'))
          ) {
            try {
              await deleteMediaFile(targetMedia);
            } catch (storageErr) {
              console.warn('[ORBIT Story] Storage deletion notice:', storageErr);
            }
          }

          // Delete reactions & viewers subcollections
          try {
            const rxSnap = await getDocs(collection(db, 'stories', storyId, 'reactions')).catch(() => null);
            if (rxSnap && !rxSnap.empty) {
              const b = writeBatch(db);
              rxSnap.docs.forEach((d) => b.delete(d.ref));
              await b.commit().catch(() => {});
            }
            const viewSnap = await getDocs(collection(db, 'stories', storyId, 'viewers')).catch(() => null);
            if (viewSnap && !viewSnap.empty) {
              const b = writeBatch(db);
              viewSnap.docs.forEach((d) => b.delete(d.ref));
              await b.commit().catch(() => {});
            }
          } catch {}

          // Hard-delete story document from Firestore
          await deleteDoc(doc(db, 'stories', storyId));
        } catch (err: any) {
          console.error('[ORBIT Backend] Failed to delete story:', err);
          handleFirestoreError(err, OperationType.DELETE, `stories/${storyId}`);
        }
      }

      showToast('Story Deleted', 'Story permanently removed from your broadcast.', 'success');
    },
    [currentUser, authUser, stories, showToast]
  );

  const markStoryViewed = useCallback((storyId: string) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s)));
  }, []);

  const recordStoryView = useCallback(
    async (storyId: string) => {
      if (!storyId) return;

      // 1. Mark viewed locally
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const currentViewers = Array.isArray(s.viewers) ? s.viewers : [];
            const isAlreadyViewer = currentUser ? currentViewers.includes(currentUser.id) : false;
            const updatedViewers = currentUser && !isAlreadyViewer
              ? [...currentViewers, currentUser.id]
              : currentViewers;
            return {
              ...s,
              viewed: true,
              viewers: updatedViewers,
              viewerCount: updatedViewers.length,
            };
          }
          return s;
        })
      );

      // 2. Persist viewer to Firestore doc & subcollection if logged in
      if (!currentUser || !authUser) return;
      const sessionKey = `${storyId}_${currentUser.id}`;
      if (recordedViewsSetRef.current.has(sessionKey)) return;
      recordedViewsSetRef.current.add(sessionKey);

      try {
        const storyRef = doc(db, 'stories', storyId);
        await updateDoc(storyRef, {
          viewers: arrayUnion(currentUser.id),
        }).catch(() => {});

        const viewerRef = doc(db, 'stories', storyId, 'viewers', currentUser.id);
        await setDoc(
          viewerRef,
          sanitizeFirestoreData({
            viewerUid: currentUser.id,
            viewerName: currentUser.name,
            viewerUsername: currentUser.username.toLowerCase(),
            viewerAvatar: currentUser.avatar || '',
            viewedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (err: any) {
        console.warn('[ORBIT] Failed to record story view:', err);
      }
    },
    [currentUser, authUser]
  );

  const fetchStoryViewers = useCallback(
    async (storyId: string): Promise<StoryViewer[]> => {
      if (!storyId) return [];
      try {
        const viewersSnap = await getDocs(collection(db, 'stories', storyId, 'viewers'));
        const viewersList: StoryViewer[] = [];
        viewersSnap.forEach((d) => {
          const data = d.data();
          if (data) {
            viewersList.push({
              viewerUid: data.viewerUid || d.id,
              viewerName: data.viewerName || 'Orbit Member',
              viewerUsername: data.viewerUsername || 'member',
              viewerAvatar: data.viewerAvatar || '',
              viewedAt: data.viewedAt || new Date().toISOString(),
            });
          }
        });
        viewersList.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
        return viewersList;
      } catch (err: any) {
        console.warn('[ORBIT] Failed to fetch story viewers:', err);
        return [];
      }
    },
    []
  );

  const reactToStory = useCallback(
    async (storyId: string, emoji: string = '❤️') => {
      if (!currentUser || !storyId) return;
      const targetStory = stories.find((s) => s.id === storyId);
      if (!targetStory) return;

      const prevReaction = targetStory.myReaction;

      // 1. Optimistic state update: immediate, no reloading, no visible loading
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const reactionsMap = { ...(s.reactions || {}) };
            reactionsMap[currentUser.id] = emoji;
            return {
              ...s,
              reactions: reactionsMap,
              myReaction: emoji,
            };
          }
          return s;
        })
      );

      // Keep viewingStory in sync immediately
      setViewingStory((curr) => {
        if (curr && curr.id === storyId) {
          const reactionsMap = { ...(curr.reactions || {}) };
          reactionsMap[currentUser.id] = emoji;
          return {
            ...curr,
            reactions: reactionsMap,
            myReaction: emoji,
          };
        }
        return curr;
      });

      // 2. Persist reaction to Firestore doc (reactions: { [uid]: emoji })
      if (authUser) {
        try {
          const storyRef = doc(db, 'stories', storyId);
          await updateDoc(storyRef, {
            [`reactions.${currentUser.id}`]: emoji,
          }).catch(() => {});

          const reactionRef = doc(db, 'stories', storyId, 'reactions', currentUser.id);
          await setDoc(
            reactionRef,
            sanitizeFirestoreData({
              userId: currentUser.id,
              userName: currentUser.name,
              userUsername: currentUser.username.toLowerCase(),
              userAvatar: currentUser.avatar || '',
              emoji,
              createdAt: new Date().toISOString(),
            })
          ).catch(() => {});
        } catch (err: any) {
          console.warn('[ORBIT] Failed to record story reaction in Firestore:', err);
          // Rollback on failure
          setStories((prev) =>
            prev.map((s) => {
              if (s.id === storyId) {
                const reactionsMap = { ...(s.reactions || {}) };
                if (prevReaction) {
                  reactionsMap[currentUser.id] = prevReaction;
                } else {
                  delete reactionsMap[currentUser.id];
                }
                return {
                  ...s,
                  reactions: reactionsMap,
                  myReaction: prevReaction,
                };
              }
              return s;
            })
          );
        }
      }

      // 3. Dispatch notification to story author if not self
      const authorUid = targetStory.authorUid || targetStory.authorId;
      if (authorUid && authorUid !== currentUser.id) {
        createNotification({
          recipientUid: authorUid,
          type: 'story_reaction',
          targetId: storyId,
          targetType: 'story',
          text: emoji,
        }).catch(() => {});
      }
      // Note: No toast per Instagram story UX requirements
    },
    [currentUser, authUser, stories, createNotification]
  );

  const removeStoryReaction = useCallback(
    async (storyId: string) => {
      if (!currentUser || !storyId) return;
      const targetStory = stories.find((s) => s.id === storyId);
      const prevEmoji = targetStory?.myReaction;

      // 1. Optimistic removal
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const reactionsMap = { ...(s.reactions || {}) };
            delete reactionsMap[currentUser.id];
            return {
              ...s,
              reactions: reactionsMap,
              myReaction: undefined,
            };
          }
          return s;
        })
      );

      // Keep viewingStory in sync immediately
      setViewingStory((curr) => {
        if (curr && curr.id === storyId) {
          const reactionsMap = { ...(curr.reactions || {}) };
          delete reactionsMap[currentUser.id];
          return {
            ...curr,
            reactions: reactionsMap,
            myReaction: undefined,
          };
        }
        return curr;
      });

      // 2. Persist removal to Firestore using deleteField()
      if (authUser && prevEmoji) {
        try {
          const storyRef = doc(db, 'stories', storyId);
          await updateDoc(storyRef, {
            [`reactions.${currentUser.id}`]: deleteField(),
          }).catch(() => {});

          const reactionRef = doc(db, 'stories', storyId, 'reactions', currentUser.id);
          await deleteDoc(reactionRef).catch(() => {});
        } catch (err: any) {
          console.warn('[ORBIT] Failed to delete story reaction in Firestore:', err);
        }
      }
    },
    [currentUser, authUser, stories]
  );

  // Conversation & Messaging actions
  const sendMessage = useCallback(
    async (
      recipientId: string,
      text: string,
      options?: {
        isForwarded?: boolean;
        replyTo?: string;
        mediaUrl?: string;
        mediaType?: string;
        mediaName?: string;
      }
    ) => {
      if (!currentUser || !recipientId || (!text.trim() && !options?.mediaUrl)) return;

      // Validate recipient existence in allUsers or Firestore
      let targetUser = allUsers.find((u) => u && u.id === recipientId);
      if (!targetUser) {
        try {
          const fetched = await getUserProfile(recipientId);
          if (fetched) {
            targetUser = fetched;
          }
        } catch {
          // ignore
        }
      }

      if (!targetUser) {
        targetUser = {
          id: recipientId,
          name: recipientId.startsWith('user_') ? recipientId.replace('user_', '') : 'Orbit Member',
          username: recipientId.startsWith('user_') ? recipientId : `user_${recipientId.slice(0, 6)}`,
          avatar: '',
          bio: '',
          interests: [],
          joinedDate: 'Recent',
          trustLevel: 'Emerging',
        };
      }

      const convId = [currentUser.id, recipientId].sort().join('_');
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();
      const isForwarded = Boolean(options?.isForwarded);
      const newMsg: ChatMessage = {
        id: messageId,
        senderId: currentUser.id,
        receiverId: recipientId,
        text: text.trim(),
        createdAt: nowIso,
        isRead: false,
        isForwarded,
        replyTo: options?.replyTo,
        mediaUrl: options?.mediaUrl,
        mediaType: options?.mediaType,
        mediaName: options?.mediaName,
      };

      // Automatically dispatch message notification
      if (recipientId && recipientId !== currentUser.id) {
        createNotification({
          recipientUid: recipientId,
          type: 'message',
          targetId: convId,
          targetType: 'conversation',
          text: text.trim().length > 60 ? text.trim().slice(0, 60) + '...' : text.trim(),
        });
      }

      if (authUser) {
        try {
          // 1. Write the new message into the existing/new Firestore conversation subcollection
          await setDoc(
            doc(db, 'conversations', convId, 'messages', messageId),
            sanitizeFirestoreData({
              id: messageId,
              senderId: currentUser.id,
              receiverId: recipientId,
              text: text.trim(),
              createdAt: nowIso,
              timestamp: serverTimestamp(),
              isRead: false,
              isForwarded,
              replyTo: options?.replyTo || null,
              mediaUrl: options?.mediaUrl || null,
              mediaType: options?.mediaType || null,
              mediaName: options?.mediaName || null,
            })
          );

          if (currentUser?.id) {
            delete clearedConversationsMapRef.current[convId];
          }

          // 2. Update conversation document metadata with serverTimestamp()
          await setDoc(
            doc(db, 'conversations', convId),
            sanitizeFirestoreData({
              id: convId,
              participantIds: [currentUser.id, recipientId],
              lastMessage: newMsg,
              lastActivity: serverTimestamp(),
              updatedAt: nowIso,
              [`hiddenFor.${currentUser.id}`]: false,
              [`hiddenFor.${recipientId}`]: false,
            }),
            { merge: true }
          );

          showToast('Message Sent', isForwarded ? 'Forwarded transmission sent.' : 'Transmission delivered to direct channel.', 'success');
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync message to Firestore:', err);
          showToast('Delivery Failed', 'Unable to transmit message to Firestore. Please try again.', 'alert');
          handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}/messages/${messageId}`);
          throw err;
        }
      } else {
        // Non-authenticated fallback for local preview
        setDirectConversations((prev) => {
          const existingIdx = prev.findIndex((c) => c.id === convId);
          let updated: Conversation[];

          if (existingIdx >= 0) {
            updated = [...prev];
            const existingMsgs = Array.isArray(updated[existingIdx].messages) ? updated[existingIdx].messages : [];
            updated[existingIdx] = {
              ...updated[existingIdx],
              participant: targetUser!,
              lastMessage: newMsg,
              messages: [...existingMsgs, newMsg],
              updatedAt: 'Just now',
            };
          } else {
            const newConvo: Conversation = {
              id: convId,
              participant: targetUser!,
              lastMessage: newMsg,
              unreadCount: 0,
              messages: [newMsg],
              updatedAt: 'Just now',
              participantIds: [currentUser.id, recipientId],
            };
            updated = [newConvo, ...prev];
          }

          return updated;
        });

        showToast('Message Sent', isForwarded ? 'Forwarded transmission sent locally.' : 'Transmission delivered locally.');
      }
    },
    [currentUser, allUsers, authUser, showToast, createNotification]
  );

  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      if (!conversationId || !messageId || !currentUser) return;

      const isGroup = groups.some((g) => g.id === conversationId);
      const nowIso = new Date().toISOString();

      if (isGroup) {
        const targetGroup = groups.find((g) => g.id === conversationId);
        const conv = groupConversations.find((c) => c.id === conversationId);
        const targetMsg = conv?.messages?.find((m) => m.id === messageId);

        if (targetMsg?.isSystem) {
          showToast('Cannot Delete', 'System messages cannot be deleted.', 'alert');
          return;
        }

        const isSender = targetMsg?.senderId === currentUser.id;
        const isAdminOrOwner =
          targetGroup?.admins.includes(authUser?.uid || '') || targetGroup?.ownerUid === authUser?.uid;

        if (!isSender && !isAdminOrOwner) {
          showToast('Unauthorized', 'You can only delete your own messages or messages in groups you administer.', 'alert');
          return;
        }

        // Soft delete message in group conversation
        setGroupConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              const updated = c.messages.map((m) =>
                m.id === messageId
                  ? { ...m, isDeleted: true, text: '', mediaUrl: undefined, mediaType: undefined, mediaName: undefined }
                  : m
              );
              return {
                ...c,
                messages: updated,
              };
            }
            return c;
          })
        );

        const cached = groupMessagesMapRef.current.get(conversationId);
        if (cached) {
          groupMessagesMapRef.current.set(
            conversationId,
            cached.map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, text: '', mediaUrl: undefined, mediaType: undefined, mediaName: undefined }
                : m
            )
          );
        }

        if (authUser) {
          try {
            await updateDoc(doc(db, 'groups', conversationId, 'messages', messageId), {
              isDeleted: true,
              text: '',
              mediaUrl: null,
              mediaType: null,
              mediaName: null,
              updatedAt: nowIso,
            });
          } catch (err) {
            console.error('[ORBIT Group] Failed to soft-delete group message:', err);
            handleFirestoreError(err, OperationType.UPDATE, `groups/${conversationId}/messages/${messageId}`);
          }
        }
        showToast('Message Deleted', 'Message deleted.');
        return;
      }

      // Direct message soft deletion
      const conv = directConversations.find((c) => c.id === conversationId);
      const targetMsg = conv?.messages?.find((m) => m.id === messageId);

      if (targetMsg?.isSystem) {
        showToast('Cannot Delete', 'System messages cannot be deleted.', 'alert');
        return;
      }

      if (targetMsg && targetMsg.senderId !== currentUser.id) {
        showToast('Unauthorized', 'You can only delete messages you personally sent.', 'alert');
        return;
      }

      // Soft delete in state
      setDirectConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            const updated = c.messages.map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, text: '', mediaUrl: undefined, mediaType: undefined, mediaName: undefined }
                : m
            );
            return {
              ...c,
              messages: updated,
            };
          }
          return c;
        })
      );

      const cached = conversationMessagesMapRef.current.get(conversationId);
      if (cached) {
        conversationMessagesMapRef.current.set(
          conversationId,
          cached.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, text: '', mediaUrl: undefined, mediaType: undefined, mediaName: undefined }
              : m
          )
        );
      }

      if (authUser) {
        try {
          await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
            isDeleted: true,
            text: '',
            mediaUrl: null,
            mediaType: null,
            mediaName: null,
            updatedAt: nowIso,
          });
        } catch (err) {
          console.error('[ORBIT Backend] Failed to soft-delete direct message in Firestore:', err);
          handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
        }
      }

      showToast('Message Deleted', 'Message deleted.');
    },
    [authUser, currentUser, directConversations, groupConversations, groups, showToast]
  );

  const deleteMessageForMe = useCallback(
    async (conversationId: string, messageId: string) => {
      if (!currentUser || !authUser || !conversationId || !messageId) return;
      const isGroup = groups.some((g) => g.id === conversationId);

      // Persist in deletedForMe local Set & localStorage
      deletedForMeSetRef.current.add(messageId);
      try {
        localStorage.setItem(
          `orbit_deleted_for_me_${authUser.uid}`,
          JSON.stringify(Array.from(deletedForMeSetRef.current))
        );
      } catch (e) {
        console.warn('Failed to save deleted message to localStorage:', e);
      }

      if (isGroup) {
        setGroupConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              const visibleMsgs = c.messages.filter((m) => m.id !== messageId);
              const latest = visibleMsgs.length > 0 ? visibleMsgs[visibleMsgs.length - 1] : undefined;
              return {
                ...c,
                messages: visibleMsgs,
                lastMessage: latest,
              };
            }
            return c;
          })
        );
        const cached = groupMessagesMapRef.current.get(conversationId);
        if (cached) {
          groupMessagesMapRef.current.set(
            conversationId,
            cached.filter((m) => m.id !== messageId)
          );
        }

        try {
          await updateDoc(doc(db, 'groups', conversationId, 'messages', messageId), {
            deletedFor: arrayUnion(authUser.uid),
          });
        } catch (err) {
          console.error('[ORBIT Group] Failed to delete message for me:', err);
        }
      } else {
        setDirectConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              const visibleMsgs = c.messages.filter((m) => m.id !== messageId);
              const latest = visibleMsgs.length > 0 ? visibleMsgs[visibleMsgs.length - 1] : undefined;
              return {
                ...c,
                messages: visibleMsgs,
                lastMessage: latest,
              };
            }
            return c;
          })
        );
        const cached = conversationMessagesMapRef.current.get(conversationId);
        if (cached) {
          conversationMessagesMapRef.current.set(
            conversationId,
            cached.filter((m) => m.id !== messageId)
          );
        }

        try {
          await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
            deletedFor: arrayUnion(authUser.uid),
          });
        } catch (err) {
          console.error('[ORBIT Direct] Failed to delete message for me:', err);
        }
      }

      showToast('Message Deleted', 'Message deleted for you.');
    },
    [authUser, currentUser, groups, showToast]
  );

  const deleteMessageForEveryone = useCallback(
    async (conversationId: string, messageId: string) => {
      if (!currentUser || !authUser || !conversationId || !messageId) return;

      const isGroup = groups.some((g) => g.id === conversationId);
      const nowIso = new Date().toISOString();
      const deleterName = currentUser.name || currentUser.username || 'Sender';

      const updateDeleted = (m: ChatMessage): ChatMessage => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          isDeleted: true,
          deletedBy: authUser.uid,
          deletedByName: deleterName,
          deletedAt: nowIso,
          text: '',
          mediaUrl: undefined,
          mediaType: undefined,
          mediaName: undefined,
          reactions: {},
        };
      };

      if (isGroup) {
        setGroupConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              const updatedMsgs = c.messages.map(updateDeleted);
              const latest = updatedMsgs.length > 0 ? updatedMsgs[updatedMsgs.length - 1] : c.lastMessage;
              return {
                ...c,
                messages: updatedMsgs,
                lastMessage: latest,
              };
            }
            return c;
          })
        );

        const cached = groupMessagesMapRef.current.get(conversationId);
        if (cached) {
          groupMessagesMapRef.current.set(conversationId, cached.map(updateDeleted));
        }

        try {
          await updateDoc(doc(db, 'groups', conversationId, 'messages', messageId), {
            isDeleted: true,
            deletedBy: authUser.uid,
            deletedByName: deleterName,
            deletedAt: nowIso,
            text: '',
            mediaUrl: null,
            mediaType: null,
            mediaName: null,
            reactions: {},
            updatedAt: nowIso,
          });
        } catch (err) {
          console.error('[ORBIT Group] Failed to delete message for everyone:', err);
          handleFirestoreError(err, OperationType.UPDATE, `groups/${conversationId}/messages/${messageId}`);
        }
      } else {
        setDirectConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              const updatedMsgs = c.messages.map(updateDeleted);
              const latest = updatedMsgs.length > 0 ? updatedMsgs[updatedMsgs.length - 1] : c.lastMessage;
              return {
                ...c,
                messages: updatedMsgs,
                lastMessage: latest,
              };
            }
            return c;
          })
        );

        const cached = conversationMessagesMapRef.current.get(conversationId);
        if (cached) {
          conversationMessagesMapRef.current.set(conversationId, cached.map(updateDeleted));
        }

        try {
          await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
            isDeleted: true,
            deletedBy: authUser.uid,
            deletedByName: deleterName,
            deletedAt: nowIso,
            text: '',
            mediaUrl: null,
            mediaType: null,
            mediaName: null,
            reactions: {},
            updatedAt: nowIso,
          });
        } catch (err) {
          console.error('[ORBIT Direct] Failed to delete message for everyone:', err);
          handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
        }
      }

      showToast('Message Deleted', 'Message deleted for everyone.');
    },
    [authUser, currentUser, groups, showToast]
  );

  const setTypingStatus = useCallback(
    async (conversationId: string, isTyping: boolean) => {
      if (!currentUser || !authUser || !conversationId) return;
      const isGroup = groups.some((g) => g.id === conversationId);
      const collectionName = isGroup ? 'groups' : 'conversations';

      try {
        const typingDocRef = doc(db, collectionName, conversationId, 'typing', authUser.uid);
        if (isTyping) {
          await setDoc(typingDocRef, {
            uid: authUser.uid,
            name: currentUser.name || currentUser.username,
            username: currentUser.username,
            timestamp: Date.now(),
          });
        } else {
          await deleteDoc(typingDocRef).catch(() => {});
        }
      } catch {
        // Non-blocking typing status
      }
    },
    [authUser, currentUser, groups]
  );

  const markMessagesAsSeen = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!currentUser || !authUser || !conversationId) return;

      const isGroup = groups.some((g) => g.id === conversationId);
      const nowIso = new Date().toISOString();

      if (isGroup) {
        const cached = groupMessagesMapRef.current.get(conversationId) || [];
        const unread = cached.filter((m) => m.senderId !== authUser.uid && (!m.readBy || !m.readBy[authUser.uid]));
        if (unread.length > 0) {
          const updated = cached.map((m) => {
            if (m.senderId !== authUser.uid) {
              return {
                ...m,
                readBy: {
                  ...(m.readBy || {}),
                  [authUser.uid]: nowIso,
                },
              };
            }
            return m;
          });
          groupMessagesMapRef.current.set(conversationId, updated);
          setGroupConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, messages: updated, unreadCount: 0 } : c))
          );

          try {
            const recent = unread.slice(-5);
            for (const m of recent) {
              await updateDoc(doc(db, 'groups', conversationId, 'messages', m.id), {
                [`readBy.${authUser.uid}`]: nowIso,
              }).catch(() => {});
            }
          } catch {
            // non-blocking
          }
        }
      } else {
        setDirectConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
      }
    },
    [authUser, currentUser, groups]
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, newText: string): Promise<void> => {
      const trimmed = newText.trim();
      if (!trimmed || !authUser || !currentUser) return;

      const isGroup = groups.some((g) => g.id === conversationId);
      const nowIso = new Date().toISOString();

      if (isGroup) {
        setGroupConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, text: trimmed, edited: true } : m
                ),
              };
            }
            return c;
          })
        );
        const cached = groupMessagesMapRef.current.get(conversationId);
        if (cached) {
          groupMessagesMapRef.current.set(
            conversationId,
            cached.map((m) => (m.id === messageId ? { ...m, text: trimmed, edited: true } : m))
          );
        }
        try {
          await updateDoc(doc(db, 'groups', conversationId, 'messages', messageId), {
            text: trimmed,
            edited: true,
            updatedAt: nowIso,
          });
          showToast('Message Edited', 'Message updated.');
        } catch (err) {
          console.error('[ORBIT Group] Edit message failed:', err);
          handleFirestoreError(err, OperationType.UPDATE, `groups/${conversationId}/messages/${messageId}`);
        }
      } else {
        setDirectConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, text: trimmed, edited: true } : m
                ),
              };
            }
            return c;
          })
        );
        const cached = conversationMessagesMapRef.current.get(conversationId);
        if (cached) {
          conversationMessagesMapRef.current.set(
            conversationId,
            cached.map((m) => (m.id === messageId ? { ...m, text: trimmed, edited: true } : m))
          );
        }
        try {
          await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
            text: trimmed,
            edited: true,
            updatedAt: nowIso,
          });
          showToast('Message Edited', 'Message updated.');
        } catch (err) {
          console.error('[ORBIT Direct] Edit message failed:', err);
          handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
        }
      }
    },
    [authUser, currentUser, groups, showToast]
  );

  const deleteConversation = useCallback(
    async (conversationId: string, options?: { localOnly?: boolean }) => {
      const isGroup = groups.some((g) => g.id === conversationId);

      if (isGroup) {
        const grp = groups.find((g) => g.id === conversationId);
        if (options?.localOnly || grp?.ownerUid !== authUser?.uid) {
          await deleteGroupForMe(conversationId);
        } else {
          await deleteGroup(conversationId);
        }
        return;
      }

      // DIRECT CONVERSATION:
      // Requirement 3: "Delete Conversation = Delete for Me. Hide only for current user. Do not delete Firestore messages or conversation globally."
      // Requirement 4: "Maintain per-user conversation visibility. If deleted, old history stays hidden; new conversation begins fresh."
      const nowIso = new Date().toISOString();
      const currentUid = authUser?.uid || currentUser?.id;

      if (currentUid) {
        clearedConversationsMapRef.current[conversationId] = nowIso;
        try {
          localStorage.setItem(
            `orbit_cleared_conversations_${currentUid}`,
            JSON.stringify(clearedConversationsMapRef.current)
          );
        } catch (e) {
          console.warn('Failed to save cleared conversations to localStorage:', e);
        }
      }

      // 1. Optimistic removal for direct conversation
      setDirectConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
      conversationMessagesMapRef.current.delete(conversationId);

      // Clean up realtime subcollection listener
      if (messageUnsubsRef.current.has(conversationId)) {
        messageUnsubsRef.current.get(conversationId)?.();
        messageUnsubsRef.current.delete(conversationId);
      }

      // 2. Persist per-user cleared state to Firestore without deleting messages or conversation doc globally
      if (authUser && currentUid) {
        try {
          await updateDoc(doc(db, 'conversations', conversationId), {
            [`clearedAt.${currentUid}`]: nowIso,
            [`hiddenFor.${currentUid}`]: true,
          }).catch(async () => {
            await setDoc(
              doc(db, 'conversations', conversationId),
              {
                clearedAt: { [currentUid]: nowIso },
                hiddenFor: { [currentUid]: true },
              },
              { merge: true }
            ).catch(() => {});
          });
        } catch (err) {
          console.warn('[ORBIT] Local conversation hide sync warning:', err);
        }
      }

      showToast('Chat Removed', 'Conversation deleted for you.');
    },
    [activeConversationId, authUser, currentUser, groups, showToast]
  );

  const togglePinConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUser || !conversationId) return;
      const isGroup = groups.some((g) => g.id === conversationId);

      if (isGroup) {
        const targetConv = groupConversations.find((c) => c.id === conversationId);
        if (!targetConv) return;
        const isCurrentlyPinned = Boolean(
          targetConv.pinned || (targetConv.pinnedBy && targetConv.pinnedBy[currentUser.id])
        );
        const nextPinned = !isCurrentlyPinned;
        const nextPinnedAt = nextPinned ? new Date().toISOString() : null;

        setGroupConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                pinned: nextPinned,
                pinnedAt: nextPinnedAt,
                pinnedBy: {
                  ...(c.pinnedBy || {}),
                  [currentUser.id]: nextPinned,
                },
              };
            }
            return c;
          })
        );
        showToast(
          nextPinned ? 'Group Pinned' : 'Group Unpinned',
          nextPinned ? 'Group chat will remain at the top.' : 'Group unpinned.'
        );
        return;
      }

      const targetConv = directConversations.find((c) => c.id === conversationId);
      if (!targetConv) return;

      const isCurrentlyPinned = Boolean(
        targetConv.pinned || (targetConv.pinnedBy && targetConv.pinnedBy[currentUser.id])
      );
      const nextPinned = !isCurrentlyPinned;
      const nextPinnedAt = nextPinned ? new Date().toISOString() : null;

      // 1. Optimistic update
      setDirectConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              pinned: nextPinned,
              pinnedAt: nextPinnedAt,
              pinnedBy: {
                ...(c.pinnedBy || {}),
                [currentUser.id]: nextPinned,
              },
            };
          }
          return c;
        })
      );

      // 2. Firestore update
      if (authUser) {
        try {
          await updateDoc(doc(db, 'conversations', conversationId), {
            pinned: nextPinned,
            pinnedAt: nextPinnedAt,
            [`pinnedBy.${currentUser.id}`]: nextPinned,
          });
        } catch (err) {
          console.error('[ORBIT Backend] Failed to toggle pin on conversation:', err);
          handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
        }
      }

      showToast(
        nextPinned ? 'Chat Pinned' : 'Chat Unpinned',
        nextPinned ? 'Conversation will remain at the top.' : 'Conversation unpinned.'
      );
    },
    [directConversations, groupConversations, groups, currentUser, authUser, showToast]
  );

  const reactToMessage = useCallback(
    async (conversationId: string, messageId: string, emoji: string) => {
      if (!currentUser || !conversationId || !messageId || !emoji) return;

      const isGroup = groups.some((g) => g.id === conversationId);
      const conv = isGroup
        ? groupConversations.find((c) => c.id === conversationId)
        : directConversations.find((c) => c.id === conversationId);
      const msg = conv?.messages.find((m) => m.id === messageId);
      const currentReactions: Record<string, string[]> = { ...(msg?.reactions || {}) };

      const currentUsersForEmoji = currentReactions[emoji] || [];
      const isSameEmoji = currentUsersForEmoji.includes(currentUser.id);

      const nextReactions: Record<string, string[]> = {};
      for (const [em, uids] of Object.entries(currentReactions)) {
        const filtered = uids.filter((uid) => uid !== currentUser.id);
        if (filtered.length > 0) {
          nextReactions[em] = filtered;
        }
      }

      if (!isSameEmoji) {
        nextReactions[emoji] = [...(nextReactions[emoji] || []), currentUser.id];
      }

      if (isGroup) {
        setGroupConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, reactions: nextReactions } : m
                ),
              };
            }
            return c;
          })
        );
        const cached = groupMessagesMapRef.current.get(conversationId);
        if (cached) {
          groupMessagesMapRef.current.set(
            conversationId,
            cached.map((m) => (m.id === messageId ? { ...m, reactions: nextReactions } : m))
          );
        }
        if (authUser) {
          try {
            await updateDoc(
              doc(db, 'groups', conversationId, 'messages', messageId),
              { reactions: nextReactions }
            );
          } catch (err) {
            console.error('[ORBIT Group] Failed to update reaction:', err);
            handleFirestoreError(err, OperationType.UPDATE, `groups/${conversationId}/messages/${messageId}`);
          }
        }
        return;
      }

      // 1. Optimistic update direct conversation
      setDirectConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            const updatedMessages = c.messages.map((m) =>
              m.id === messageId ? { ...m, reactions: nextReactions } : m
            );
            return {
              ...c,
              messages: updatedMessages,
            };
          }
          return c;
        })
      );

      const cached = conversationMessagesMapRef.current.get(conversationId);
      if (cached) {
        conversationMessagesMapRef.current.set(
          conversationId,
          cached.map((m) => (m.id === messageId ? { ...m, reactions: nextReactions } : m))
        );
      }

      // 2. Firestore update direct conversation
      if (authUser) {
        try {
          await updateDoc(
            doc(db, 'conversations', conversationId, 'messages', messageId),
            {
              reactions: nextReactions,
            }
          );
        } catch (err) {
          console.error('[ORBIT Backend] Failed to update reaction:', err);
          handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
        }
      }
    },
    [currentUser, directConversations, groupConversations, groups, authUser]
  );

  // Group Operations
  const createGroup = useCallback(
    async (
      name: string,
      memberUids: string[],
      photoURL?: string,
      description?: string
    ): Promise<GroupChat | undefined> => {
      if (!currentUser || !authUser) {
        showToast('Authentication Required', 'Please sign in to create groups.', 'alert');
        return undefined;
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        showToast('Invalid Name', 'Group name cannot be empty.', 'alert');
        return undefined;
      }

      // Ensure creator is included and members are unique
      const uniqueMembers = Array.from(new Set([authUser.uid, ...memberUids]));
      if (uniqueMembers.length < 2) {
        showToast('More Members Needed', 'A group must have at least 2 members.', 'alert');
        return undefined;
      }
      if (uniqueMembers.length > 100) {
        showToast('Group Limit', 'A group cannot exceed 100 members.', 'alert');
        return undefined;
      }

      const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();
      const creatorName = currentUser.name || currentUser.username || 'Orbit Member';

      const groupData: GroupChat = {
        id: groupId,
        name: trimmedName,
        photoURL: photoURL || undefined,
        description: description?.trim() || undefined,
        ownerUid: authUser.uid,
        admins: [authUser.uid],
        members: uniqueMembers,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastMessage: `${creatorName} created the group "${trimmedName}"`,
        lastMessageAt: nowIso,
        lastSenderUid: authUser.uid,
        isGroup: true,
      };

      try {
        // 1. Create the group document
        await setDoc(doc(db, 'groups', groupId), sanitizeFirestoreData(groupData));

        // 2. Create the initial system message in subcollection
        const initMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const systemMessage = {
          id: initMessageId,
          senderUid: authUser.uid,
          senderName: creatorName,
          senderUsername: currentUser.username,
          senderAvatar: currentUser.avatar || '',
          text: `${creatorName} created the group "${trimmedName}"`,
          createdAt: nowIso,
          edited: false,
          deletedFor: [],
          isSystem: true,
        };

        await setDoc(doc(db, 'groups', groupId, 'messages', initMessageId), sanitizeFirestoreData(systemMessage));

        showToast('Group Created', `Group "${trimmedName}" created successfully!`, 'success');
        setActiveConversationId(groupId);
        return groupData;
      } catch (err) {
        console.error('[ORBIT Group] Failed to create group:', err);
        showToast('Error', 'Failed to create group. Please check connection.', 'alert');
        handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}`);
        return undefined;
      }
    },
    [currentUser, authUser, showToast, setActiveConversationId]
  );

  const sendGroupMessage = useCallback(
    async (
      groupId: string,
      text: string,
      options?: {
        mediaUrl?: string;
        mediaType?: string;
        mediaName?: string;
        replyTo?: string;
        replyToText?: string;
        replyToName?: string;
      }
    ): Promise<void> => {
      if (!currentUser || !authUser) {
        showToast('Authentication Required', 'Please sign in to send messages.', 'alert');
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText && !options?.mediaUrl) {
        return;
      }

      const targetGroup = groups.find((g) => g.id === groupId);
      if (!targetGroup) {
        showToast('Group Not Found', 'Target group does not exist.', 'alert');
        return;
      }

      if (!targetGroup.members.includes(authUser.uid)) {
        showToast('Access Denied', 'You are not a member of this group.', 'alert');
        return;
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();
      const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const groupMsgPayload = {
        id: messageId,
        senderUid: authUser.uid,
        senderId: authUser.uid,
        senderName: currentUser.name || currentUser.username,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar || '',
        text: trimmedText,
        mediaUrl: options?.mediaUrl || null,
        mediaType: options?.mediaType || null,
        mediaName: options?.mediaName || null,
        replyTo: options?.replyTo || null,
        replyToText: options?.replyToText || null,
        replyToName: options?.replyToName || null,
        createdAt: nowIso,
        edited: false,
        isDeleted: false,
        deletedFor: [],
        isSystem: false,
      };

      // Optimistic append to local messages state and cache to guarantee messages never replace each other
      const optimisticMsg: ChatMessage = {
        id: messageId,
        senderId: authUser.uid,
        receiverId: groupId,
        text: trimmedText,
        createdAt: timeFormatted,
        isRead: true,
        mediaUrl: options?.mediaUrl || undefined,
        mediaType: options?.mediaType || undefined,
        mediaName: options?.mediaName || undefined,
        replyTo: options?.replyTo || undefined,
        replyToText: options?.replyToText || undefined,
        replyToName: options?.replyToName || undefined,
        senderName: currentUser.name || currentUser.username,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar || '',
        isSystem: false,
        edited: false,
        isDeleted: false,
      };

      const cached = groupMessagesMapRef.current.get(groupId) || [];
      const updatedMessages = normalizeAndSortMessages([...cached, optimisticMsg]);
      groupMessagesMapRef.current.set(groupId, updatedMessages);

      setGroupConversations((prev) =>
        prev.map((c) => {
          if (c.id === groupId) {
            return {
              ...c,
              messages: updatedMessages,
              lastMessage: optimisticMsg,
            };
          }
          return c;
        })
      );

      const previewSnippet = trimmedText || (options?.mediaType ? `[${options.mediaType}]` : 'Sent an attachment');

      try {
        // 1. Write message to group messages subcollection with stable ID
        await setDoc(doc(db, 'groups', groupId, 'messages', messageId), sanitizeFirestoreData(groupMsgPayload));

        // 2. Update parent group metadata
        await updateDoc(doc(db, 'groups', groupId), {
          lastMessage: previewSnippet,
          lastMessageAt: nowIso,
          lastSenderUid: authUser.uid,
          updatedAt: nowIso,
        });
      } catch (err) {
        console.error('[ORBIT Group] Failed to send group message:', err);
        showToast('Delivery Failed', 'Unable to transmit group message. Please try again.', 'alert');
        handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}/messages/${messageId}`);
        throw err;
      }
    },
    [currentUser, authUser, groups, showToast]
  );

  const updateGroup = useCallback(
    async (
      groupId: string,
      updates: Partial<Pick<GroupChat, 'name' | 'photoURL' | 'description' | 'admins' | 'coAdmins' | 'members'>>
    ): Promise<void> => {
      if (!currentUser || !authUser) return;

      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const callerCoAdmins = group.coAdmins || group.admins.filter((uid) => uid !== group.ownerUid);
      const isAdminOrCoAdmin =
        group.ownerUid === authUser.uid ||
        callerCoAdmins.includes(authUser.uid) ||
        group.admins.includes(authUser.uid);

      if (!isAdminOrCoAdmin) {
        showToast('Permission Denied', 'Only group admins and co-admins can modify group settings.', 'alert');
        return;
      }

      try {
        const sanitizedUpdates = sanitizeFirestoreData({
          ...updates,
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'groups', groupId), sanitizedUpdates);
        showToast('Group Updated', 'Group information updated successfully.', 'success');
      } catch (err) {
        console.error('[ORBIT Group] Failed to update group:', err);
        showToast('Update Failed', 'Failed to update group information.', 'alert');
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
        throw err;
      }
    },
    [currentUser, authUser, groups, showToast]
  );

  const promoteToCoAdmin = useCallback(
    async (groupId: string, memberUid: string): Promise<void> => {
      if (!currentUser || !authUser) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      if (group.ownerUid !== authUser.uid) {
        showToast('Permission Denied', 'Only the group Admin can promote members to Co-Admin.', 'alert');
        return;
      }

      const currentCoAdmins = group.coAdmins || group.admins.filter((uid) => uid !== group.ownerUid);
      if (currentCoAdmins.includes(memberUid)) return;

      const newCoAdmins = [...currentCoAdmins, memberUid];
      const newAdmins = Array.from(new Set([...group.admins, memberUid]));

      const memberUser = allUsers.find((u) => u.id === memberUid);
      const memberName = memberUser?.name || memberUser?.username || 'Member';
      const adminName = currentUser.name || currentUser.username || 'Admin';
      const nowIso = new Date().toISOString();
      const systemText = `${adminName} promoted @${memberUser?.username || memberName} to Co-Admin`;

      try {
        await updateDoc(doc(db, 'groups', groupId), {
          coAdmins: newCoAdmins,
          admins: newAdmins,
          updatedAt: nowIso,
          lastMessage: systemText,
          lastMessageAt: nowIso,
        });

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await setDoc(doc(db, 'groups', groupId, 'messages', msgId), sanitizeFirestoreData({
          id: msgId,
          senderUid: authUser.uid,
          senderName: adminName,
          text: systemText,
          createdAt: nowIso,
          isSystem: true,
          edited: false,
          deletedFor: [],
        }));

        showToast('Role Updated', `@${memberUser?.username || memberName} is now a Co-Admin.`, 'success');
      } catch (err) {
        console.error('[ORBIT Group] Promote failed:', err);
        showToast('Error', 'Failed to promote member.', 'alert');
      }
    },
    [currentUser, authUser, groups, allUsers, showToast]
  );

  const demoteFromCoAdmin = useCallback(
    async (groupId: string, memberUid: string): Promise<void> => {
      if (!currentUser || !authUser) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      if (group.ownerUid !== authUser.uid) {
        showToast('Permission Denied', 'Only the group Admin can demote Co-Admins.', 'alert');
        return;
      }

      const currentCoAdmins = group.coAdmins || group.admins.filter((uid) => uid !== group.ownerUid);
      const newCoAdmins = currentCoAdmins.filter((uid) => uid !== memberUid);
      const newAdmins = group.admins.filter((uid) => uid !== memberUid || uid === group.ownerUid);

      const memberUser = allUsers.find((u) => u.id === memberUid);
      const memberName = memberUser?.name || memberUser?.username || 'Member';
      const adminName = currentUser.name || currentUser.username || 'Admin';
      const nowIso = new Date().toISOString();
      const systemText = `${adminName} demoted @${memberUser?.username || memberName} to Member`;

      try {
        await updateDoc(doc(db, 'groups', groupId), {
          coAdmins: newCoAdmins,
          admins: newAdmins,
          updatedAt: nowIso,
          lastMessage: systemText,
          lastMessageAt: nowIso,
        });

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await setDoc(doc(db, 'groups', groupId, 'messages', msgId), sanitizeFirestoreData({
          id: msgId,
          senderUid: authUser.uid,
          senderName: adminName,
          text: systemText,
          createdAt: nowIso,
          isSystem: true,
          edited: false,
          deletedFor: [],
        }));

        showToast('Role Updated', `@${memberUser?.username || memberName} is now a Member.`, 'default');
      } catch (err) {
        console.error('[ORBIT Group] Demote failed:', err);
        showToast('Error', 'Failed to demote Co-Admin.', 'alert');
      }
    },
    [currentUser, authUser, groups, allUsers, showToast]
  );

  const kickMember = useCallback(
    async (groupId: string, memberUid: string): Promise<void> => {
      if (!currentUser || !authUser) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const isCallerAdmin = group.ownerUid === authUser.uid;
      const callerCoAdmins = group.coAdmins || group.admins.filter((uid) => uid !== group.ownerUid);
      const isCallerCoAdmin = callerCoAdmins.includes(authUser.uid);

      if (!isCallerAdmin && !isCallerCoAdmin) {
        showToast('Permission Denied', 'You do not have moderation permissions in this group.', 'alert');
        return;
      }

      const isTargetAdmin = group.ownerUid === memberUid;
      const isTargetCoAdmin = callerCoAdmins.includes(memberUid);

      if (isTargetAdmin) {
        showToast('Cannot Remove Admin', 'The group Admin cannot be removed.', 'alert');
        return;
      }

      if (isCallerCoAdmin && isTargetCoAdmin) {
        showToast('Permission Denied', 'Co-Admins cannot kick other Co-Admins.', 'alert');
        return;
      }

      const newMembers = group.members.filter((uid) => uid !== memberUid);
      const newAdmins = group.admins.filter((uid) => uid !== memberUid);
      const newCoAdmins = callerCoAdmins.filter((uid) => uid !== memberUid);

      const targetUser = allUsers.find((u) => u.id === memberUid);
      const targetName = targetUser?.name || targetUser?.username || 'A member';
      const callerName = currentUser.name || currentUser.username || 'Moderator';
      const nowIso = new Date().toISOString();
      const systemText = `${callerName} removed @${targetUser?.username || targetName} from the group`;

      try {
        await updateDoc(doc(db, 'groups', groupId), {
          members: newMembers,
          admins: newAdmins,
          coAdmins: newCoAdmins,
          updatedAt: nowIso,
          lastMessage: systemText,
          lastMessageAt: nowIso,
        });

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await setDoc(doc(db, 'groups', groupId, 'messages', msgId), sanitizeFirestoreData({
          id: msgId,
          senderUid: authUser.uid,
          senderName: callerName,
          text: systemText,
          createdAt: nowIso,
          isSystem: true,
          edited: false,
          deletedFor: [],
        }));

        showToast('Member Removed', `${targetName} was removed from the group.`, 'default');
      } catch (err) {
        console.error('[ORBIT Group] Kick failed:', err);
        showToast('Error', 'Failed to remove member.', 'alert');
      }
    },
    [currentUser, authUser, groups, allUsers, showToast]
  );

  const addGroupMembers = useCallback(
    async (groupId: string, newMemberUids: string[]): Promise<void> => {
      if (!currentUser || !authUser || newMemberUids.length === 0) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const isCallerAdmin = group.ownerUid === authUser.uid;
      const callerCoAdmins = group.coAdmins || group.admins.filter((uid) => uid !== group.ownerUid);
      const isCallerCoAdmin = callerCoAdmins.includes(authUser.uid);

      if (!isCallerAdmin && !isCallerCoAdmin) {
        showToast('Permission Denied', 'Only Admins and Co-Admins can add new members.', 'alert');
        return;
      }

      const updatedMembers = Array.from(new Set([...group.members, ...newMemberUids]));
      const callerName = currentUser.name || currentUser.username || 'Moderator';
      const nowIso = new Date().toISOString();

      const addedUsernames = newMemberUids
        .map((uid) => {
          const u = allUsers.find((user) => user.id === uid);
          return u ? `@${u.username}` : 'a new member';
        })
        .join(', ');

      const systemText = `${callerName} added ${addedUsernames} to the group`;

      try {
        await updateDoc(doc(db, 'groups', groupId), {
          members: updatedMembers,
          updatedAt: nowIso,
          lastMessage: systemText,
          lastMessageAt: nowIso,
        });

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await setDoc(doc(db, 'groups', groupId, 'messages', msgId), sanitizeFirestoreData({
          id: msgId,
          senderUid: authUser.uid,
          senderName: callerName,
          text: systemText,
          createdAt: nowIso,
          isSystem: true,
          edited: false,
          deletedFor: [],
        }));

        showToast('Members Added', `${newMemberUids.length} member(s) added to group.`, 'success');
      } catch (err) {
        console.error('[ORBIT Group] Add members failed:', err);
        showToast('Error', 'Failed to add members.', 'alert');
      }
    },
    [currentUser, authUser, groups, allUsers, showToast]
  );

  const leaveGroup = useCallback(
    async (groupId: string): Promise<void> => {
      if (!currentUser || !authUser) return;

      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      if (!group.members.includes(authUser.uid)) return;

      const callerCoAdmins = group.coAdmins || group.admins.filter((uid) => uid !== group.ownerUid);
      const newMembers = group.members.filter((uid) => uid !== authUser.uid);
      const newAdmins = group.admins.filter((uid) => uid !== authUser.uid);
      const newCoAdmins = callerCoAdmins.filter((uid) => uid !== authUser.uid);

      try {
        if (newMembers.length === 0) {
          await deleteDoc(doc(db, 'groups', groupId));
        } else {
          let newOwnerUid = group.ownerUid;
          if (group.ownerUid === authUser.uid) {
            newOwnerUid = newCoAdmins.length > 0 ? newCoAdmins[0] : (newAdmins.length > 0 ? newAdmins[0] : newMembers[0]);
            if (!newAdmins.includes(newOwnerUid)) {
              newAdmins.push(newOwnerUid);
            }
          }

          const nowIso = new Date().toISOString();
          const userName = currentUser.name || currentUser.username || 'A member';
          const leaveSystemMessage = `🚪 ${userName} left the group`;

          await updateDoc(doc(db, 'groups', groupId), {
            members: newMembers,
            leftMembers: arrayUnion(authUser.uid),
            admins: newAdmins,
            coAdmins: newCoAdmins,
            ownerUid: newOwnerUid,
            lastMessage: leaveSystemMessage,
            lastMessageAt: nowIso,
            lastSenderUid: authUser.uid,
            updatedAt: nowIso,
          });

          const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await setDoc(doc(db, 'groups', groupId, 'messages', msgId), sanitizeFirestoreData({
            id: msgId,
            senderUid: authUser.uid,
            senderName: userName,
            text: leaveSystemMessage,
            createdAt: nowIso,
            isSystem: true,
            systemType: 'member_left',
            edited: false,
            deletedFor: [],
          }));

          // Update local state to show left state
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    members: newMembers,
                    admins: newAdmins,
                    coAdmins: newCoAdmins,
                    ownerUid: newOwnerUid,
                    leftMembers: [...(g.leftMembers || []), authUser.uid],
                  }
                : g
            )
          );
        }

        showToast('Left Group', `You have left "${group.name}".`, 'default');
      } catch (err) {
        console.error('[ORBIT Group] Failed to leave group:', err);
        showToast('Error', 'Failed to leave group. Please try again.', 'alert');
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
        throw err;
      }
    },
    [currentUser, authUser, groups, showToast]
  );

  const deleteGroupForMe = useCallback(
    async (groupId: string): Promise<void> => {
      if (!currentUser || !authUser) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      try {
        await updateDoc(doc(db, 'groups', groupId), {
          leftMembers: arrayRemove(authUser.uid),
          deletedFor: arrayUnion(authUser.uid),
        }).catch(() => {});

        // Remove from local lists
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGroupConversations((prev) => prev.filter((c) => c.id !== groupId));
        groupMessagesMapRef.current.delete(groupId);
        if (groupMessageUnsubsRef.current.has(groupId)) {
          groupMessageUnsubsRef.current.get(groupId)?.();
          groupMessageUnsubsRef.current.delete(groupId);
        }

        if (activeConversationId === groupId) {
          setActiveConversationId(null);
        }
        showToast('Conversation Deleted', `Removed "${group.name}" from your chats.`);
      } catch (err) {
        console.error('[ORBIT Group] Failed to delete group for me:', err);
        showToast('Error', 'Failed to delete conversation.', 'alert');
      }
    },
    [currentUser, authUser, groups, activeConversationId, showToast, setActiveConversationId]
  );

  const transferAdmin = useCallback(
    async (groupId: string, newOwnerUid: string): Promise<void> => {
      if (!currentUser || !authUser) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      if (group.ownerUid !== authUser.uid) {
        showToast('Permission Denied', 'Only the current Admin can transfer group ownership.', 'alert');
        return;
      }

      const targetUser = allUsers.find((u) => u.id === newOwnerUid);
      const targetName = targetUser?.name || targetUser?.username || 'member';
      const nowIso = new Date().toISOString();
      const updatedAdmins = Array.from(new Set([...group.admins, newOwnerUid, authUser.uid]));
      const systemMessage = `🔁 Admin transferred ownership to ${targetName}`;

      try {
        await updateDoc(doc(db, 'groups', groupId), {
          ownerUid: newOwnerUid,
          admins: updatedAdmins,
          updatedAt: nowIso,
          lastMessage: systemMessage,
          lastMessageAt: nowIso,
        });

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await setDoc(doc(db, 'groups', groupId, 'messages', msgId), sanitizeFirestoreData({
          id: msgId,
          senderUid: authUser.uid,
          senderName: currentUser.name || currentUser.username,
          text: systemMessage,
          createdAt: nowIso,
          isSystem: true,
          systemType: 'role_change',
          edited: false,
          deletedFor: [],
        }));

        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  ownerUid: newOwnerUid,
                  admins: updatedAdmins,
                }
              : g
          )
        );

        showToast('Admin Transferred', `${targetName} is now the group Admin.`, 'success');
      } catch (err) {
        console.error('[ORBIT Group] Failed to transfer admin:', err);
        showToast('Error', 'Failed to transfer admin ownership.', 'alert');
      }
    },
    [currentUser, authUser, groups, allUsers, showToast]
  );

  const deleteGroup = useCallback(
    async (groupId: string): Promise<void> => {
      if (!currentUser || !authUser) return;

      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      if (group.ownerUid !== authUser.uid) {
        showToast('Permission Denied', 'Only the group Admin can delete this group.', 'alert');
        return;
      }

      try {
        // 1. Delete all message docs in subcollection
        const msgsSnap = await getDocs(collection(db, 'groups', groupId, 'messages'));
        if (!msgsSnap.empty) {
          const batch = writeBatch(db);
          msgsSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }

        // 2. Delete parent group doc
        await deleteDoc(doc(db, 'groups', groupId));

        // 3. Clean up local state
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGroupConversations((prev) => prev.filter((c) => c.id !== groupId));
        groupMessagesMapRef.current.delete(groupId);
        if (groupMessageUnsubsRef.current.has(groupId)) {
          groupMessageUnsubsRef.current.get(groupId)?.();
          groupMessageUnsubsRef.current.delete(groupId);
        }

        if (activeConversationId === groupId) {
          setActiveConversationId(null);
        }
        showToast('Group Deleted', `Group "${group.name}" was permanently deleted for all members.`, 'default');
      } catch (err) {
        console.error('[ORBIT Group] Failed to delete group:', err);
        showToast('Error', 'Failed to delete group.', 'alert');
        handleFirestoreError(err, OperationType.DELETE, `groups/${groupId}`);
        throw err;
      }
    },
    [currentUser, authUser, groups, activeConversationId, showToast, setActiveConversationId]
  );

  const forwardMessage = useCallback(
    async (recipientId: string, message: ChatMessage) => {
      if (!recipientId || !message || !message.text) return;
      const isGroup = groups.some((g) => g.id === recipientId);
      if (isGroup) {
        await sendGroupMessage(recipientId, message.text);
      } else {
        await sendMessage(recipientId, message.text, { isForwarded: true });
      }
    },
    [sendMessage, sendGroupMessage, groups]
  );

  const markConversationAsRead = useCallback((conversationId: string) => {
    setDirectConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    setGroupConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  // Notifications
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read && !n.isRead).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n.notificationId === id ? { ...n, read: true, isRead: true } : n))
      );
      if (authUser) {
        try {
          await updateDoc(doc(db, 'notifications', id), {
            read: true,
            isRead: true,
          });
        } catch (err) {
          console.warn('[ORBIT] Failed to mark notification as read in Firestore:', err);
        }
      }
    },
    [authUser]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadList = notifications.filter((n) => !n.read && !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));

    if (authUser && unreadList.length > 0) {
      try {
        const batch = writeBatch(db);
        unreadList.forEach((n) => {
          batch.update(doc(db, 'notifications', n.id), {
            read: true,
            isRead: true,
          });
        });
        await batch.commit();
      } catch (err) {
        console.warn('[ORBIT] Failed to mark all notifications as read in Firestore:', err);
      }
    }
    showToast('All caught up', 'All notifications marked as read.', 'success');
  }, [notifications, authUser, showToast]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    showToast('Notifications Cleared', 'Activity drawer emptied.');
  }, [showToast]);

  // Settings
  const updateSettings = useCallback(
    async (updates: Partial<OrbitSettings>) => {
      let nextSettings: OrbitSettings | null = null;
      setSettings((prev) => {
        nextSettings = {
          privacy: { ...prev.privacy, ...(updates.privacy || {}) },
          notifications: { ...prev.notifications, ...(updates.notifications || {}) },
          preferences: { ...prev.preferences, ...(updates.preferences || {}) },
          connections: { ...prev.connections, ...(updates.connections || {}) },
        };
        OrbitStorage.saveSettings(nextSettings);
        return nextSettings;
      });

      if (authUser && nextSettings) {
        const s: OrbitSettings = nextSettings;
        try {
          const likesVal = Boolean(s.notifications.likes);
          const mentionsVal = Boolean(s.notifications.mentions ?? s.notifications.comments);
          const followersVal = Boolean(s.notifications.followers ?? s.notifications.follows);
          const messagesVal = Boolean(s.notifications.messages);
          const storyVal = Boolean(s.notifications.storyReplies ?? s.notifications.storyActivity);
          const recsVal = Boolean(s.notifications.recommendations);
          const redMotionVal = Boolean(s.preferences.reducedMotion);
          const compactVal = Boolean(s.preferences.compactView ?? s.preferences.compactMode);

          const firestoreFields = {
            profileDiscoverability: s.privacy.profileVisibility,
            defaultPostVisibility: s.privacy.defaultPostVisibility,
            directMessageReach: s.privacy.whoCanMessageMe,
            directMessagesReach: s.privacy.whoCanMessageMe,
            likesNotifications: likesVal,
            mentionsNotifications: mentionsVal,
            followerNotifications: followersVal,
            directMessageNotifications: messagesVal,
            storyNotifications: storyVal,
            recommendationNotifications: recsVal,
            notifications: {
              likes: likesVal,
              mentions: mentionsVal,
              followers: followersVal,
              messages: messagesVal,
              storyReplies: storyVal,
              recommendations: recsVal,
              comments: mentionsVal,
              follows: followersVal,
              storyActivity: storyVal,
            },
            reducedMotion: redMotionVal,
            compactView: compactVal,
            compactMode: compactVal,
            updatedAt: new Date().toISOString(),
          };

          await setDoc(
            doc(db, 'users', authUser.uid),
            sanitizeFirestoreData(firestoreFields),
            { merge: true }
          );
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync settings to Firestore:', err);
        }
      }
    },
    [authUser]
  );

  // Compute Signal Metrics & Next Moves dynamically
  const { metrics: signalMetrics, nextMoves } = useMemo(() => {
    return calculateSignalMetrics(currentUser, posts, followingIds, stories, conversations);
  }, [currentUser, posts, followingIds, stories, conversations]);

  // Modal Handlers
  const openCreatePost = useCallback(() => setIsCreatePostOpen(true), []);
  const closeCreatePost = useCallback(() => setIsCreatePostOpen(false), []);

  const openStoryCreator = useCallback(() => setIsStoryCreatorOpen(true), []);
  const closeStoryCreator = useCallback(() => setIsStoryCreatorOpen(false), []);

  const openStoryViewer = useCallback((story: Story, sequence?: Story[]) => {
    setViewingStory(story);
    if (sequence && sequence.length > 0) {
      setViewingStorySequence(sequence);
    } else {
      // Default sequence: find all stories by the same author
      const authorStories = stories.filter((s) => s.authorId === story.authorId);
      setViewingStorySequence(authorStories.length > 0 ? authorStories : [story]);
    }
  }, [stories]);

  const closeStoryViewer = useCallback(() => {
    setViewingStory(null);
    setViewingStorySequence([]);
  }, []);

  const openEditProfile = useCallback(() => setIsEditProfileOpen(true), []);
  const closeEditProfile = useCallback(() => setIsEditProfileOpen(false), []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const openNewMessage = useCallback(() => setIsNewMessageOpen(true), []);
  const closeNewMessage = useCallback(() => setIsNewMessageOpen(false), []);

  const openCreateGroup = useCallback(() => setIsCreateGroupOpen(true), []);
  const closeCreateGroup = useCallback(() => setIsCreateGroupOpen(false), []);

  const openProfilePreview = useCallback((user: UserProfile) => setViewingProfileUser(user), []);
  const closeProfilePreview = useCallback(() => setViewingProfileUser(null), []);

  const toggleNotifications = useCallback(() => setIsNotificationsOpen((prev) => !prev), []);
  const closeNotifications = useCallback(() => setIsNotificationsOpen(false), []);

  const openFollowList = useCallback((initialTab: 'followers' | 'following' = 'followers', targetUser?: UserProfile | null) => {
    setFollowListModal({
      isOpen: true,
      initialTab,
      targetUser: targetUser || null,
    });
  }, []);

  const closeFollowList = useCallback(() => {
    setFollowListModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  return (
    <OrbitContext.Provider
      value={{
        activeTab,
        previousTab,
        setActiveTab,
        navigateBack,
        authUser,
        isAuthReady,
        signInWithGoogle: handleSignInWithGoogle,
        signOutUser: handleSignOut,
        currentUser,
        updateCurrentUser,
        allUsers,
        getUserById,
        posts,
        savedPosts,
        savedPostIds,
        createPost,
        deletePost,
        toggleLikePost,
        toggleSavePost,
        toggleRepost,
        addComment,
        deleteComment,
        followingIds,
        followerIds,
        followUser,
        unfollowUser,
        isFollowing,
        stories,
        addStory,
        deleteStory,
        markStoryViewed,
        recordStoryView,
        fetchStoryViewers,
        reactToStory,
        removeStoryReaction,
        conversations,
        groups,
        createGroup,
        sendGroupMessage,
        updateGroup,
        promoteToCoAdmin,
        demoteFromCoAdmin,
        kickMember,
        addGroupMembers,
        leaveGroup,
        deleteGroup,
        deleteGroupForMe,
        transferAdmin,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        deleteMessage,
        deleteMessageForMe,
        deleteMessageForEveryone,
        editMessage,
        deleteConversation,
        togglePinConversation,
        reactToMessage,
        forwardMessage,
        markConversationAsRead,
        markMessagesAsSeen,
        typingUsers,
        setTypingStatus,
        isRightSidebarOpen,
        toggleRightSidebar,
        setRightSidebarOpen,
        chatWorkspaceMode,
        setChatWorkspaceMode,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        createNotification,
        settings,
        updateSettings,
        signalMetrics,
        nextMoves,
        isCreatePostOpen,
        openCreatePost,
        closeCreatePost,
        isStoryCreatorOpen,
        openStoryCreator,
        closeStoryCreator,
        viewingStory,
        viewingStorySequence,
        openStoryViewer,
        closeStoryViewer,
        isEditProfileOpen,
        openEditProfile,
        closeEditProfile,
        isSearchOpen,
        openSearch,
        closeSearch,
        isNewMessageOpen,
        openNewMessage,
        closeNewMessage,
        isCreateGroupOpen,
        openCreateGroup,
        closeCreateGroup,
        viewingProfileUser,
        openProfilePreview,
        closeProfilePreview,
        isNotificationsOpen,
        toggleNotifications,
        closeNotifications,
        followListModal,
        openFollowList,
        closeFollowList,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </OrbitContext.Provider>
  );
};

export const useOrbit = (): OrbitContextType => {
  const context = useContext(OrbitContext);
  if (!context) {
    throw new Error('useOrbit must be used within an OrbitProvider');
  }
  return context;
};
