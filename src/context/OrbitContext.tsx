import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserProfile,
  Post,
  Story,
  Conversation,
  OrbitNotification,
  OrbitSettings,
  SignalMetrics,
  NextMoveItem,
  ActiveNavTab,
  ToastMessage,
  VisibilityType,
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
  onSnapshot,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';

function extractSettingsFromUserProfile(data: UserProfile | null | undefined, email?: string | null): OrbitSettings {
  if (!data) {
    return DEFAULT_SETTINGS;
  }
  return {
    privacy: {
      profileVisibility: (data.profileDiscoverability as any) || (data as any).profileVisibility || DEFAULT_SETTINGS.privacy.profileVisibility,
      defaultPostVisibility: data.defaultPostVisibility || DEFAULT_SETTINGS.privacy.defaultPostVisibility,
      whoCanMessageMe: (data.directMessagesReach as any) || (data as any).whoCanMessageMe || DEFAULT_SETTINGS.privacy.whoCanMessageMe,
      showActivityStatus: true,
      showOnlineStatus: true,
      allowFollowRequests: true,
    },
    notifications: {
      likes: data.notifications?.likes ?? true,
      mentions: data.notifications?.mentions ?? data.notifications?.comments ?? true,
      followers: data.notifications?.followers ?? data.notifications?.follows ?? true,
      messages: data.notifications?.messages ?? true,
      storyReplies: data.notifications?.storyReplies ?? data.notifications?.storyActivity ?? true,
      recommendations: data.notifications?.recommendations ?? true,
      comments: data.notifications?.mentions ?? data.notifications?.comments ?? true,
      follows: data.notifications?.followers ?? data.notifications?.follows ?? true,
      storyActivity: data.notifications?.storyReplies ?? data.notifications?.storyActivity ?? true,
    },
    preferences: {
      theme: 'dark',
      reducedMotion: Boolean(data.reducedMotion),
      compactMode: Boolean(data.compactView ?? data.compactMode),
      compactView: Boolean(data.compactView ?? data.compactMode),
      autoplayVideo: false,
      dataSavingMode: false,
    },
    connections: {
      googleConnected: Boolean(email || data.id),
      googleEmail: email || undefined,
    },
  };
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
  createPost: (content: {
    text: string;
    media?: string;
    mediaType?: 'image' | 'video';
    mediaName?: string;
    visibility: VisibilityType;
    tags?: string[];
  }) => Promise<Post | undefined>;
  deletePost: (postId: string) => Promise<void>;
  toggleLikePost: (postId: string) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;

  // Follows
  followingIds: string[];
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;

  // Stories
  stories: Story[];
  addStory: (data: { media: string; mediaType: 'image' | 'video'; caption?: string }) => Promise<void>;
  markStoryViewed: (storyId: string) => void;

  // Conversations & Messages
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (recipientId: string, text: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => void;

  // Notifications
  notifications: OrbitNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;

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
  openStoryViewer: (story: Story) => void;
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

  viewingProfileUser: UserProfile | null;
  openProfilePreview: (user: UserProfile) => void;
  closeProfilePreview: () => void;

  isNotificationsOpen: boolean;
  toggleNotifications: () => void;
  closeNotifications: () => void;

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
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [repostedPostIds, setRepostedPostIds] = useState<string[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<OrbitNotification[]>([]);
  const [settings, setSettings] = useState<OrbitSettings>(() => OrbitStorage.getSettings());
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<UserProfile[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Real-time computed posts with user's interaction flags (likes, reposts, saves)
  const posts = useMemo(() => {
    return rawPosts.map((p) => ({
      ...p,
      likedByMe: likedPostIds.includes(p.id),
      repostedByMe: repostedPostIds.includes(p.id),
      savedByMe: savedPostIds.includes(p.id),
    }));
  }, [rawPosts, likedPostIds, repostedPostIds, savedPostIds]);

  // Modal UI state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<UserProfile | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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
              profileDiscoverability: 'Public',
              defaultPostVisibility: 'Public',
              directMessagesReach: 'Everyone',
              notifications: {
                likes: true,
                mentions: true,
                followers: true,
                messages: true,
                storyReplies: true,
                recommendations: true,
              },
              reducedMotion: false,
              compactView: false,
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
        setSavedPostIds([]);
        setLikedPostIds([]);
        setRepostedPostIds([]);
        setConversations([]);
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
        const remotePosts: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            const rawCreatedAt = data.createdAt;
            let createdAtStr = new Date().toISOString();
            if (rawCreatedAt) {
              if (typeof rawCreatedAt.toDate === 'function') {
                createdAtStr = rawCreatedAt.toDate().toISOString();
              } else {
                createdAtStr = String(rawCreatedAt);
              }
            }

            const likes = typeof data.likes === 'number' ? data.likes : (typeof data.likeCount === 'number' ? data.likeCount : 0);
            const reposts = typeof data.reposts === 'number' ? data.reposts : (typeof data.repostCount === 'number' ? data.repostCount : 0);
            const comments = Array.isArray(data.comments) ? data.comments : [];
            const commentCount = typeof data.commentCount === 'number' ? data.commentCount : comments.length;

            const authorUid = data.authorUid || data.authorId || '';
            const authorName = data.displayName || data.authorName || 'Orbit Member';
            const authorUsername = data.username || data.authorUsername || 'member';
            const authorAvatar = data.avatar || data.authorAvatar || '';
            const mediaUrl = data.mediaUrl || data.media || '';

            remotePosts.push({
              id: docSnap.id,
              postId: data.postId || docSnap.id,
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
              media: mediaUrl,
              mediaUrl,
              mediaType: data.mediaType,
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
          }
        });

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

    // 2.2 Sync Stories Collection
    const storiesUnsub = onSnapshot(
      collection(db, 'stories'),
      (snapshot) => {
        const remoteStories: Story[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            remoteStories.push({
              id: docSnap.id,
              authorId: data.authorId || '',
              authorName: data.authorName || 'Orbit Member',
              authorUsername: data.authorUsername || 'member',
              authorAvatar: data.authorAvatar || '',
              authorVerified: Boolean(data.authorVerified),
              media: data.media || '',
              mediaType: data.mediaType || 'image',
              caption: data.caption || '',
              createdAt: data.createdAt || '',
              expiresAt: data.expiresAt || '',
              viewed: Boolean(data.viewed),
            });
          }
        });
        setStories(remoteStories);
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

    // 3.2 Listen to following subcollection
    const followingUnsub = onSnapshot(
      collection(db, 'users', authUser.uid, 'following'),
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => ids.push(d.id));
        setFollowingIds(ids);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}/following`);
      }
    );

    // 3.3 Listen to savedPosts subcollection
    const savedUnsub = onSnapshot(
      collection(db, 'users', authUser.uid, 'savedPosts'),
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => ids.push(d.id));
        setSavedPostIds(ids);
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

    // 3.6 Listen to user notifications
    const notifsUnsub = onSnapshot(
      collection(db, 'users', authUser.uid, 'notifications'),
      (snapshot) => {
        const notifs: OrbitNotification[] = [];
        snapshot.forEach((d) => {
          notifs.push({ id: d.id, ...(d.data() as Omit<OrbitNotification, 'id'>) });
        });
        setNotifications(notifs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}/notifications`);
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
        const convs: Conversation[] = [];
        for (const d of snapshot.docs) {
          const data = d.data();
          if (!data || !Array.isArray(data.participantIds)) continue;

          // Find the other participant UID
          const otherUid = data.participantIds.find((id: string) => id !== authUser.uid);
          if (!otherUid) {
            // Malformed conversation doc, clean it up
            try {
              await deleteDoc(doc(db, 'conversations', d.id));
            } catch {
              // Ignore
            }
            continue;
          }

          // Resolve other participant profile
          let otherProfile = allRegisteredUsers.find((u) => u.id === otherUid);
          if (!otherProfile) {
            try {
              const fetched = await getUserProfile(otherUid);
              if (fetched) {
                otherProfile = fetched;
              }
            } catch {
              // Ignore
            }
          }

          if (!otherProfile) {
            // The participant does not exist in /users (e.g. legacy test accounts like user_madhav)
            // Clean up this bad data so it never causes errors or appears in the UI
            try {
              await deleteDoc(doc(db, 'conversations', d.id));
            } catch {
              // Ignore
            }
            continue;
          }

          const fallbackMsg = {
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

          convs.push({
            id: d.id,
            participant: otherProfile,
            lastMessage: lastMsg,
            unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
            messages: Array.isArray(data.messages) && data.messages.length > 0 ? data.messages : [lastMsg],
            updatedAt: data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            participantIds: data.participantIds,
          });
        }
        setConversations(convs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'conversations');
      }
    );

    return () => {
      userDocUnsub();
      followingUnsub();
      savedUnsub();
      likedUnsub();
      repostsUnsub();
      notifsUnsub();
      convosUnsub();
    };
  }, [authUser]);

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
      setConversations([]);
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

  // Follow actions
  const followUser = useCallback(
    async (userId: string) => {
      setFollowingIds((prev) => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });

      if (authUser) {
        const path = `users/${authUser.uid}/following/${userId}`;
        try {
          await setDoc(doc(db, 'users', authUser.uid, 'following', userId), {
            targetUserId: userId,
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }

      const targetUser = allUsers.find((u) => u.id === userId);
      showToast(
        'Orbit Locked',
        targetUser ? `Connected to @${targetUser.username}'s frequency.` : 'Added to following.'
      );
    },
    [authUser, allUsers, showToast]
  );

  const unfollowUser = useCallback(
    async (userId: string) => {
      setFollowingIds((prev) => prev.filter((id) => id !== userId));

      if (authUser) {
        const path = `users/${authUser.uid}/following/${userId}`;
        try {
          await deleteDoc(doc(db, 'users', authUser.uid, 'following', userId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
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
      mediaType?: 'image' | 'video';
      mediaName?: string;
      visibility: VisibilityType;
      tags?: string[];
    }) => {
      if (!currentUser) return undefined;

      const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();
      const mediaUrl = content.media || '';

      const newPost: Post = {
        id: postId,
        postId,
        authorId: currentUser.id,
        authorUid: currentUser.id,
        authorName: currentUser.name,
        displayName: currentUser.name,
        authorUsername: currentUser.username,
        username: currentUser.username,
        authorAvatar: currentUser.avatar,
        avatar: currentUser.avatar,
        authorVerified: currentUser.verified,
        text: content.text.trim(),
        media: mediaUrl,
        mediaUrl,
        mediaType: content.mediaType,
        mediaName: content.mediaName,
        visibility: content.visibility,
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
        tags: content.tags || ['Orbit'],
      };

      // Optimistic local update
      setRawPosts((prev) => [newPost, ...prev.filter((p) => p.id !== postId)]);

      // Remote Firestore sync if authenticated
      if (authUser) {
        try {
          const firestoreDoc = {
            postId,
            id: postId,
            authorUid: currentUser.id,
            authorId: currentUser.id,
            username: currentUser.username,
            authorUsername: currentUser.username,
            displayName: currentUser.name,
            authorName: currentUser.name,
            avatar: currentUser.avatar || '',
            authorAvatar: currentUser.avatar || '',
            authorVerified: Boolean(currentUser.verified),
            text: content.text.trim(),
            mediaUrl: mediaUrl || null,
            media: mediaUrl || null,
            mediaType: content.mediaType || null,
            mediaName: content.mediaName || null,
            visibility: content.visibility,
            likeCount: 0,
            likes: 0,
            repostCount: 0,
            reposts: 0,
            commentCount: 0,
            comments: [],
            views: 1,
            tags: content.tags || ['Orbit'],
            createdAt: nowIso,
          };
          await setDoc(doc(db, 'posts', postId), sanitizeFirestoreData(firestoreDoc));
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync post to Firestore:', err);
          handleFirestoreError(err, OperationType.CREATE, `posts/${postId}`);
        }
      }

      showToast('Signal Published', 'Your transmission is now moving through the orbit.', 'success');
      return newPost;
    },
    [currentUser, authUser, showToast]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      setRawPosts((prev) => prev.filter((p) => p.id !== postId));

      if (authUser) {
        try {
          await deleteDoc(doc(db, 'posts', postId));
        } catch (err) {
          console.error('[ORBIT Backend] Failed to delete post in Firestore:', err);
          handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
        }
      }

      showToast('Transmission Deleted', 'Post has been removed from Orbit.');
    },
    [authUser, showToast]
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
    [likedPostIds, authUser]
  );

  const toggleSavePost = useCallback(
    async (postId: string) => {
      const isSaved = savedPostIds.includes(postId);
      const nextSaved = !isSaved;

      // Optimistic update
      setSavedPostIds((prev) =>
        nextSaved ? [...prev, postId] : prev.filter((id) => id !== postId)
      );

      if (authUser) {
        try {
          if (isSaved) {
            await deleteDoc(doc(db, 'users', authUser.uid, 'savedPosts', postId));
          } else {
            await setDoc(doc(db, 'users', authUser.uid, 'savedPosts', postId), {
              postId,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync saved post to Firestore:', err);
          // Rollback
          setSavedPostIds((prev) =>
            isSaved ? [...prev, postId] : prev.filter((id) => id !== postId)
          );
        }
      }

      showToast(
        nextSaved ? 'Post Saved' : 'Bookmark Removed',
        nextSaved ? 'Saved to your private archive.' : 'Removed from saved collection.'
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
      if (!currentUser) return;

      const commentId = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nowIso = new Date().toISOString();
      const newComment = {
        id: commentId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatar,
        text: text.trim(),
        createdAt: 'Just now',
        likes: 0,
      };

      setRawPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const nextComments = [...p.comments, newComment];
            return {
              ...p,
              comments: nextComments,
              commentCount: nextComments.length,
            };
          }
          return p;
        })
      );

      if (authUser) {
        try {
          await setDoc(
            doc(db, 'posts', postId, 'comments', commentId),
            sanitizeFirestoreData({
              id: commentId,
              authorId: currentUser.id,
              authorUid: currentUser.id,
              authorName: currentUser.name,
              displayName: currentUser.name,
              authorUsername: currentUser.username,
              username: currentUser.username,
              authorAvatar: currentUser.avatar,
              avatar: currentUser.avatar,
              text: text.trim(),
              createdAt: nowIso,
              likes: 0,
            })
          );
          await updateDoc(doc(db, 'posts', postId), {
            commentCount: (rawPosts.find((p) => p.id === postId)?.comments.length || 0) + 1,
          });
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync comment to Firestore:', err);
        }
      }

      showToast('Reply Transmitted', 'Your comment was posted to the signal thread.');
    },
    [currentUser, authUser, showToast, rawPosts]
  );

  // Story actions
  const addStory = useCallback(
    async (data: { media: string; mediaType: 'image' | 'video'; caption?: string }) => {
      if (!currentUser) return;

      const storyId = `story_${Date.now()}`;
      const newStory: Story = {
        id: storyId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatar,
        media: data.media,
        mediaType: data.mediaType,
        caption: data.caption,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        viewed: false,
      };

      setStories((prev) => [newStory, ...prev]);

      if (authUser) {
        try {
          await setDoc(doc(db, 'stories', storyId), sanitizeFirestoreData(newStory));
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync story to Firestore:', err);
        }
      }

      showToast('Story Broadcasted', 'Your 24h visual transmission is live.', 'success');
    },
    [currentUser, authUser, showToast]
  );

  const markStoryViewed = useCallback((storyId: string) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s)));
  }, []);

  // Conversation & Messaging actions
  const sendMessage = useCallback(
    async (recipientId: string, text: string) => {
      if (!currentUser || !recipientId || !text.trim()) return;

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
        showToast('Recipient Not Found', 'Cannot send message to an unverified or unknown user.', 'alert');
        return;
      }

      const convId = [currentUser.id, recipientId].sort().join('_');
      const messageId = `msg_${Date.now()}`;
      const newMsg = {
        id: messageId,
        senderId: currentUser.id,
        receiverId: recipientId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setConversations((prev) => {
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
          };
          updated = [newConvo, ...prev];
        }

        return updated;
      });

      if (authUser) {
        try {
          await setDoc(
            doc(db, 'conversations', convId),
            sanitizeFirestoreData({
              participantIds: [currentUser.id, recipientId],
              lastMessage: newMsg,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );

          await setDoc(
            doc(db, 'conversations', convId, 'messages', messageId),
            sanitizeFirestoreData(newMsg)
          );
        } catch (err) {
          console.error('[ORBIT Backend] Failed to sync message to Firestore:', err);
        }
      }

      showToast('Message Sent', 'Transmission delivered to direct channel.');
    },
    [currentUser, allUsers, authUser, showToast]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      if (authUser) {
        try {
          await deleteDoc(doc(db, 'conversations', conversationId));
        } catch (err) {
          console.error('[ORBIT Backend] Failed to delete conversation:', err);
        }
      }

      showToast('Conversation Closed', 'Direct message history removed.');
    },
    [authUser, showToast]
  );

  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  // Notifications
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All caught up', 'All notifications marked as read.');
  }, [showToast]);

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
          const firestoreFields = {
            profileDiscoverability: s.privacy.profileVisibility,
            defaultPostVisibility: s.privacy.defaultPostVisibility,
            directMessagesReach: s.privacy.whoCanMessageMe,
            notifications: {
              likes: Boolean(s.notifications.likes),
              mentions: Boolean(s.notifications.mentions ?? s.notifications.comments),
              followers: Boolean(s.notifications.followers ?? s.notifications.follows),
              messages: Boolean(s.notifications.messages),
              storyReplies: Boolean(s.notifications.storyReplies ?? s.notifications.storyActivity),
              recommendations: Boolean(s.notifications.recommendations),
            },
            reducedMotion: Boolean(s.preferences.reducedMotion),
            compactView: Boolean(s.preferences.compactView ?? s.preferences.compactMode),
            compactMode: Boolean(s.preferences.compactView ?? s.preferences.compactMode),
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

  const openStoryViewer = useCallback((story: Story) => setViewingStory(story), []);
  const closeStoryViewer = useCallback(() => setViewingStory(null), []);

  const openEditProfile = useCallback(() => setIsEditProfileOpen(true), []);
  const closeEditProfile = useCallback(() => setIsEditProfileOpen(false), []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const openNewMessage = useCallback(() => setIsNewMessageOpen(true), []);
  const closeNewMessage = useCallback(() => setIsNewMessageOpen(false), []);

  const openProfilePreview = useCallback((user: UserProfile) => setViewingProfileUser(user), []);
  const closeProfilePreview = useCallback(() => setViewingProfileUser(null), []);

  const toggleNotifications = useCallback(() => setIsNotificationsOpen((prev) => !prev), []);
  const closeNotifications = useCallback(() => setIsNotificationsOpen(false), []);

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
        createPost,
        deletePost,
        toggleLikePost,
        toggleSavePost,
        toggleRepost,
        addComment,
        followingIds,
        followUser,
        unfollowUser,
        isFollowing,
        stories,
        addStory,
        markStoryViewed,
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        deleteConversation,
        markConversationAsRead,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
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
        viewingProfileUser,
        openProfilePreview,
        closeProfilePreview,
        isNotificationsOpen,
        toggleNotifications,
        closeNotifications,
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
