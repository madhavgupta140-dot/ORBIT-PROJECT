import { UserProfile, Post, Story, Conversation, OrbitNotification, OrbitSettings } from '../types';

export const DEFAULT_SETTINGS: OrbitSettings = {
  privacy: {
    profileVisibility: 'Public',
    defaultPostVisibility: 'Public',
    whoCanMessageMe: 'Everyone',
    showActivityStatus: true,
    showOnlineStatus: true,
    allowFollowRequests: true,
  },
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    followers: true,
    messages: true,
    mentions: true,
    storyActivity: true,
    storyReplies: true,
    recommendations: true,
  },
  preferences: {
    theme: 'dark',
    reducedMotion: false,
    compactMode: false,
    compactView: false,
    autoplayVideo: false,
    dataSavingMode: false,
  },
  connections: {
    googleConnected: false,
    googleEmail: undefined,
  },
};
