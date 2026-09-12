import {
  UserProfile,
  Post,
  Story,
  Conversation,
  OrbitNotification,
  OrbitSettings,
  SignalMetrics,
  NextMoveItem,
} from '../types';
import { DEFAULT_SETTINGS } from '../data/seedData';

const STORAGE_KEYS = {
  USER: 'orbit:v5:user',
  SETTINGS: 'orbit:v5:settings',
  SEARCH_HISTORY: 'orbit:v5:search_history',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[ORBIT Storage] Failed to load key "${key}", using default.`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[ORBIT Storage] Failed to write key "${key}".`, err);
  }
}

export class OrbitStorage {
  // User Profile
  static getUser(): UserProfile | null {
    return null;
  }

  static saveUser(user: UserProfile | null): void {
    if (user === null && isBrowser()) {
      window.localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  // Settings
  static getSettings(): OrbitSettings {
    return getItem<OrbitSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  static saveSettings(settings: OrbitSettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  // Search History
  static getSearchHistory(): string[] {
    return getItem<string[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  static saveSearchHistory(history: string[]): void {
    setItem(STORAGE_KEYS.SEARCH_HISTORY, history);
  }
}

// Signal Calculation Engine
export function calculateSignalMetrics(
  user: UserProfile | null,
  posts: Post[],
  followingIds: string[],
  stories: Story[],
  conversations: Conversation[]
): { metrics: SignalMetrics; nextMoves: NextMoveItem[] } {
  if (!user) {
    return {
      metrics: {
        score: 0,
        levelText: '0% signal level',
        orbitStatus: 'Inactive Orbit',
        description: 'Authenticate to establish your personal orbit identity',
        momentum: 'Starting',
        trust: 'Private',
        reachCount: 0,
        breakdown: {
          posts: 0,
          engagement: 0,
          profile: 0,
          following: 0,
          followers: 0,
          conversations: 0,
          stories: 0,
        },
      },
      nextMoves: [],
    };
  }

  const myPosts = (posts || []).filter((p) => p && p.authorId === user.id);
  const myStories = (stories || []).filter((s) => s && s.authorId === user.id);
  const myConversations = (conversations || []).filter((c) => {
    if (!c) return false;
    if (Array.isArray(c.messages) && c.messages.some((m) => m && m.senderId === user.id)) return true;
    if (c.lastMessage && c.lastMessage.senderId === user.id) return true;
    if (Array.isArray(c.participantIds) && c.participantIds.includes(user.id)) return true;
    return false;
  });

  // Likes on my posts
  const likesReceived = myPosts.reduce((acc, p) => acc + (typeof p.likes === 'number' ? p.likes : 0), 0);
  // Posts created score (up to 25 pts)
  const postsScore = Math.min(25, myPosts.length * 12.5);

  // Engagement score (likes given, comments made, likes received) (up to 20 pts)
  const likedByMeCount = (posts || []).filter((p) => p && p.likedByMe).length;
  const savedCount = (posts || []).filter((p) => p && p.savedByMe).length;
  const engagementScore = Math.min(20, likedByMeCount * 3 + savedCount * 3 + likesReceived * 2);

  // Profile completion score (up to 20 pts)
  let profileScore = 0;
  if (user.name && user.name.trim() !== '') profileScore += 5;
  if (user.bio && user.bio.trim() !== '') profileScore += 5;
  if (user.countryName || user.location || user.website) profileScore += 5;
  if (Array.isArray(user.interests) && user.interests.length > 0) profileScore += 5;

  // Following activity (up to 15 pts)
  const followingScore = Math.min(15, (followingIds || []).length * 5);

  // Followers score (up to 10 pts)
  const followersScore = Math.min(10, (user.followerCount || 0) * 5);

  // Conversations & stories (up to 10 pts)
  const convoScore = Math.min(5, myConversations.length * 2.5);
  const storyScore = Math.min(5, myStories.length * 2.5);

  const rawScore = Math.round(
    postsScore + engagementScore + profileScore + followingScore + followersScore + convoScore + storyScore
  );
  const score = Math.min(100, Math.max(0, rawScore));

  // Determine qualitative states
  let orbitStatus = 'Fresh Orbit';
  let description = 'Publish signals to start generating orbit momentum';
  let momentum: SignalMetrics['momentum'] = 'Starting';
  let trust: SignalMetrics['trust'] = 'Private';

  if (score < 25) {
    orbitStatus = 'Emerging Orbit';
    description = 'Initial presence established';
    momentum = 'Starting';
    trust = 'Emerging';
  } else if (score < 60) {
    orbitStatus = 'Active Orbit';
    description = 'Steady signal transmission';
    momentum = 'Steady';
    trust = 'Established';
  } else if (score < 85) {
    orbitStatus = 'Resonant Orbit';
    description = 'Strong multidirectional reach';
    momentum = 'Surging';
    trust = 'Trusted';
  } else {
    orbitStatus = 'Dominant Orbit';
    description = 'High-frequency resonance';
    momentum = 'Hyperactive';
    trust = 'Trusted';
  }

  // Reach count computation based on actual interactions and posts
  const reachCount = myPosts.length + (followingIds || []).length + (user.followerCount || 0) + likesReceived;

  // Next Moves Calculation
  const nextMoves: NextMoveItem[] = [];

  // Move 1: Post creation
  if (myPosts.length === 0) {
    nextMoves.push({
      id: 'move_post_1',
      step: '01',
      title: 'Publish your first post',
      actionText: 'Create post',
      actionRoute: 'home',
      actionType: 'create_post',
      completed: false,
    });
  } else if (myPosts.length === 1) {
    nextMoves.push({
      id: 'move_post_2',
      step: '01',
      title: 'Broadcast a second post',
      actionText: 'Create post',
      actionRoute: 'home',
      actionType: 'create_post',
      completed: false,
    });
  } else {
    nextMoves.push({
      id: 'move_post_done',
      step: '01',
      title: 'Share regular updates',
      actionText: 'Post update',
      actionRoute: 'home',
      actionType: 'create_post',
      completed: true,
    });
  }

  // Move 2: Story or Explore
  if (myStories.length === 0) {
    nextMoves.push({
      id: 'move_story_1',
      step: '02',
      title: 'Share a 24h story',
      actionText: 'Add story',
      actionRoute: 'home',
      actionType: 'add_story',
      completed: false,
    });
  } else {
    nextMoves.push({
      id: 'move_story_done',
      step: '02',
      title: 'Story broadcast active',
      actionText: 'Add another',
      actionRoute: 'home',
      actionType: 'add_story',
      completed: true,
    });
  }

  // Move 3: Profile customization
  const isProfileComplete = Boolean(user.bio && user.bio.length > 10 && user.interests && user.interests.length > 0);
  if (!isProfileComplete) {
    nextMoves.push({
      id: 'move_profile',
      step: '03',
      title: 'Complete your profile bio',
      actionText: 'Edit profile',
      actionRoute: 'profile',
      actionType: 'edit_profile',
      completed: false,
    });
  } else {
    nextMoves.push({
      id: 'move_profile_done',
      step: '03',
      title: 'Profile identity verified',
      actionText: 'View profile',
      actionRoute: 'profile',
      completed: true,
    });
  }

  return {
    metrics: {
      score,
      levelText: `${score}% signal level`,
      orbitStatus,
      description,
      momentum,
      trust,
      reachCount,
      breakdown: {
        posts: postsScore,
        engagement: engagementScore,
        profile: profileScore,
        following: followingScore,
        followers: followersScore,
        conversations: convoScore,
        stories: storyScore,
      },
    },
    nextMoves,
  };
}
