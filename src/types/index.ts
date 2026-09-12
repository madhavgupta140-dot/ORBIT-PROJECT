export type VisibilityType = 'Public' | 'Followers' | 'Private';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  banner?: string;
  bio: string;
  countryCode?: string;
  countryName?: string;
  location?: string;
  website?: string;
  interests: string[];
  joinedDate: string;
  verified?: boolean;
  trustLevel?: 'Private' | 'Emerging' | 'Established' | 'Trusted';
  followerCount?: number;
  followersCount?: number;
  followingCount?: number;
  // Settings persisted directly in users/{uid}
  profileDiscoverability?: 'Public' | 'FollowersOnly' | 'Private';
  defaultPostVisibility?: VisibilityType;
  directMessageReach?: 'Everyone' | 'Followers' | 'None';
  directMessagesReach?: 'Everyone' | 'Followers' | 'None';
  likesNotifications?: boolean;
  mentionsNotifications?: boolean;
  followerNotifications?: boolean;
  directMessageNotifications?: boolean;
  storyNotifications?: boolean;
  recommendationNotifications?: boolean;
  notifications?: {
    likes?: boolean;
    mentions?: boolean;
    followers?: boolean;
    messages?: boolean;
    storyReplies?: boolean;
    recommendations?: boolean;
    comments?: boolean;
    follows?: boolean;
    storyActivity?: boolean;
  };
  reducedMotion?: boolean;
  compactView?: boolean;
  compactMode?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PostComment {
  id: string;
  commentId?: string;
  postId?: string;
  authorUid?: string;
  authorId: string;
  authorName: string;
  displayName?: string;
  authorUsername: string;
  username?: string;
  authorAvatar: string;
  avatar?: string;
  text: string;
  createdAt: string | any;
  likes?: number;
}

export interface Post {
  id: string;
  postId?: string;
  authorId: string;
  authorUid?: string;
  authorName: string;
  displayName?: string;
  authorUsername: string;
  username?: string;
  authorAvatar: string;
  avatar?: string;
  authorVerified?: boolean;
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
  createdAt: string;
  likes: number;
  likeCount?: number;
  likedByMe?: boolean;
  comments: PostComment[];
  commentCount?: number;
  reposts: number;
  repostCount?: number;
  shares?: number;
  repostedByMe?: boolean;
  savedByMe?: boolean;
  views: number;
  tags?: string[];
  isPinned?: boolean;
}

export interface StoryViewer {
  viewerUid: string;
  viewerName: string;
  viewerUsername: string;
  viewerAvatar: string;
  viewedAt: string;
}

export interface StoryReaction {
  userId: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  emoji: '❤️' | '🔥' | '😂' | '😮' | '😢' | string;
  createdAt: string;
}

export interface Story {
  id: string;
  storyId?: string;
  authorId: string;
  authorUid: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  media: string;
  mediaUrl: string;
  downloadURL?: string;
  storagePath: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  expiresAtMs?: number;
  viewers?: string[];
  viewerCount?: number;
  reactions?: Record<string, string | number>;
  myReaction?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  viewed?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  isForwarded?: boolean;
  reactions?: Record<string, string[]>;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  replyTo?: string;
  replyToText?: string;
  replyToName?: string;
  senderName?: string;
  senderUsername?: string;
  senderAvatar?: string;
  isSystem?: boolean;
  systemType?: 'promote' | 'demote' | 'add' | 'kick' | 'leave' | 'transfer' | 'delete' | 'info';
  deletedFor?: string[];
  edited?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedByName?: string;
  deletedAt?: string;
  rawCreatedAt?: any;
  timestamp?: any;
  readBy?: Record<string, string>;
}

export type GroupMemberRole = 'admin' | 'co-admin' | 'member';

export type ChatWorkspaceMode = 'normal' | 'expanded' | 'fullscreen';

export interface GroupChat {
  id: string;
  name: string;
  photoURL?: string;
  description?: string;
  ownerUid: string;
  admins: string[];
  coAdmins?: string[];
  members: string[];
  leftMembers?: string[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderUid?: string;
  lastSenderName?: string;
  isGroup: true;
}

export interface GroupChatMessage {
  id: string;
  senderUid: string;
  senderName?: string;
  senderUsername?: string;
  senderAvatar?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  replyTo?: string;
  replyToText?: string;
  replyToName?: string;
  createdAt: string;
  edited?: boolean;
  deletedFor?: string[];
  isSystem?: boolean;
  systemType?: 'promote' | 'demote' | 'add' | 'kick' | 'leave' | 'transfer' | 'delete' | 'info';
  isDeleted?: boolean;
  deletedBy?: string;
  deletedByName?: string;
  deletedAt?: string;
  readBy?: Record<string, string>;
}

export interface Conversation {
  id: string;
  participant: UserProfile;
  lastMessage: ChatMessage;
  unreadCount: number;
  messages: ChatMessage[];
  updatedAt: string;
  participantIds?: string[];
  pinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: Record<string, boolean>;
  isGroup?: boolean;
  group?: GroupChat;
  hiddenFor?: string[];
  leftMembers?: string[];
}

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'story_reaction'
  | 'message'
  | 'repost'
  | 'system';

export interface OrbitNotification {
  id: string;
  notificationId?: string;
  recipientUid: string;
  actorUid: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string;
  type: NotificationType;
  targetId: string;
  targetType: 'user' | 'post' | 'comment' | 'story' | 'conversation' | 'message';
  text?: string;
  createdAt: string;
  read: boolean;
  isRead?: boolean;
  // Backwards compatibility fields for existing components
  actor?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  title?: string;
  description?: string;
}

export interface PrivacySettings {
  profileVisibility: 'Public' | 'FollowersOnly' | 'Private';
  defaultPostVisibility: VisibilityType;
  whoCanMessageMe: 'Everyone' | 'Followers' | 'None';
  showActivityStatus: boolean;
  showOnlineStatus: boolean;
  allowFollowRequests: boolean;
}

export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  mentions: boolean;
  storyActivity: boolean;
  storyReplies?: boolean;
  followers?: boolean;
  recommendations: boolean;
}

export interface AppPreferences {
  theme: 'dark' | 'dim' | 'light';
  reducedMotion: boolean;
  compactMode: boolean;
  compactView?: boolean;
  autoplayVideo: boolean;
  dataSavingMode: boolean;
}

export interface AccountConnections {
  googleConnected: boolean;
  googleEmail?: string;
}

export interface OrbitSettings {
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  preferences: AppPreferences;
  connections: AccountConnections;
}

export interface NextMoveItem {
  id: string;
  step: string;
  title: string;
  actionText?: string;
  actionRoute?: 'home' | 'explore' | 'messages' | 'profile' | 'settings';
  actionType?: 'create_post' | 'edit_profile' | 'explore_people' | 'add_story' | 'send_message';
  completed: boolean;
}

export interface SignalMetrics {
  score: number; // 0 to 100
  levelText: string;
  orbitStatus: string;
  description: string;
  momentum: 'Starting' | 'Emerging' | 'Steady' | 'Surging' | 'Hyperactive';
  trust: 'Private' | 'Emerging' | 'Established' | 'Trusted';
  reachCount: number;
  breakdown: {
    posts: number;
    engagement: number;
    profile: number;
    following: number;
    followers: number;
    conversations: number;
    stories: number;
  };
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'default' | 'success' | 'alert';
}

export type ActiveNavTab =
  | 'home'
  | 'explore'
  | 'notifications'
  | 'messages'
  | 'profile'
  | 'settings'
  | 'privacy'
  | 'terms'
  | 'status';

export interface Follow {
  followerUid: string;
  followingUid: string;
  createdAt: string;
}

export interface SavedPost {
  postId: string;
  savedAt: string | any;
}

