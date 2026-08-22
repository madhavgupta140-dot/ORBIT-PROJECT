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
  // Settings persisted directly in users/{uid}
  profileDiscoverability?: 'Public' | 'FollowersOnly' | 'Private';
  defaultPostVisibility?: VisibilityType;
  directMessagesReach?: 'Everyone' | 'Followers' | 'None';
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
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
  likes: number;
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
  mediaType?: 'image' | 'video';
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

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  media: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewed?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participant: UserProfile;
  lastMessage: ChatMessage;
  unreadCount: number;
  messages: ChatMessage[];
  updatedAt: string;
  participantIds?: string[];
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'repost' | 'message' | 'system';

export interface OrbitNotification {
  id: string;
  type: NotificationType;
  actor: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  title: string;
  description: string;
  targetId?: string; // e.g. postId or conversationId
  createdAt: string;
  isRead: boolean;
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
  | 'messages'
  | 'profile'
  | 'settings'
  | 'privacy'
  | 'terms'
  | 'status';
