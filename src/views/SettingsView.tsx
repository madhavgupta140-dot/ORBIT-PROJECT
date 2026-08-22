import React from 'react';
import {
  Shield,
  Bell,
  Sliders,
  Link as LinkIcon,
  Mail,
  ChevronRight,
  FileText,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { VisibilityType } from '../types';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    authUser,
    signInWithGoogle,
    signOutUser,
    setActiveTab,
  } = useOrbit();

  const handleToggleGoogle = async () => {
    if (authUser) {
      await signOutUser();
    } else {
      await signInWithGoogle();
    }
  };

  return (
    <div id="settings-view" className="flex flex-col flex-1 min-h-screen bg-[#0a0a0a]">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-stone-800/80 px-4 py-3">
        <h1 className="font-bold text-lg text-stone-100">Settings</h1>
        <p className="text-xs text-stone-500">Manage account, privacy, alerts, and preferences</p>
      </div>

      <div className="p-4 md:p-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
        {/* Section 1: Account Linking */}
        <section className="bg-[#121212] border border-stone-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <LinkIcon className="w-4 h-4 text-white" />
            <h2 className="font-bold text-sm text-stone-100">
              Connected Accounts
            </h2>
          </div>
          <p className="text-xs text-stone-400 mb-4">
            Manage your sign-in methods and verification providers.
          </p>

          <div className="flex flex-col gap-3">
            {/* Google */}
            <div className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-stone-400" />
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-stone-200">
                    Google Identity
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {authUser ? authUser.email || 'Authenticated' : 'Not signed in'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleToggleGoogle}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer active:scale-95 ${
                  authUser
                    ? 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
                    : 'bg-white text-black hover:bg-stone-200'
                }`}
              >
                {authUser ? 'Sign Out' : 'Sign in with Google'}
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Privacy */}
        <section className="bg-[#121212] border border-stone-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-white" />
            <h2 className="font-bold text-sm text-stone-100">
              Privacy & Audience
            </h2>
          </div>
          <p className="text-xs text-stone-400 mb-4">
            Control who can see your content, discover your profile, and message you.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 rounded-xl">
              <div>
                <span className="font-bold text-xs text-stone-200 block">
                  Profile Discoverability
                </span>
                <span className="text-[11px] text-stone-500">
                  Control who can find your profile
                </span>
              </div>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) =>
                  updateSettings({
                    privacy: {
                      ...settings.privacy,
                      profileVisibility: e.target.value as 'Public' | 'FollowersOnly' | 'Private',
                    },
                  })
                }
                className="bg-[#202020] border border-stone-700 text-xs text-stone-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-stone-400"
              >
                <option value="Public">Public (Everyone)</option>
                <option value="FollowersOnly">Followers Only</option>
                <option value="Private">Private</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 rounded-xl">
              <div>
                <span className="font-bold text-xs text-stone-200 block">
                  Default Post Visibility
                </span>
                <span className="text-[11px] text-stone-500">
                  Pre-selected audience for new posts
                </span>
              </div>
              <select
                value={settings.privacy.defaultPostVisibility}
                onChange={(e) =>
                  updateSettings({
                    privacy: {
                      ...settings.privacy,
                      defaultPostVisibility: e.target.value as VisibilityType,
                    },
                  })
                }
                className="bg-[#202020] border border-stone-700 text-xs text-stone-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-stone-400"
              >
                <option value="Public">Everyone</option>
                <option value="Followers">Followers Only</option>
                <option value="Private">Only Me</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 rounded-xl">
              <div>
                <span className="font-bold text-xs text-stone-200 block">
                  Direct Messages Reach
                </span>
                <span className="text-[11px] text-stone-500">
                  Who can start a new message thread with you
                </span>
              </div>
              <select
                value={settings.privacy.whoCanMessageMe}
                onChange={(e) =>
                  updateSettings({
                    privacy: {
                      ...settings.privacy,
                      whoCanMessageMe: e.target.value as 'Everyone' | 'Followers' | 'None',
                    },
                  })
                }
                className="bg-[#202020] border border-stone-700 text-xs text-stone-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-stone-400"
              >
                <option value="Everyone">Everyone</option>
                <option value="Followers">Followers Only</option>
                <option value="None">No One</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: In-App Notifications */}
        <section className="bg-[#121212] border border-stone-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-white" />
            <h2 className="font-bold text-sm text-stone-100">
              Notification Preferences
            </h2>
          </div>
          <p className="text-xs text-stone-400 mb-4">
            Select what triggers alerts and activity badges.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'likes', label: 'Likes & Reactions' },
              { key: 'mentions', label: 'Replies & Mentions' },
              { key: 'followers', label: 'New Followers' },
              { key: 'messages', label: 'Direct Messages' },
              { key: 'storyReplies', label: 'Story Replies & Reactions' },
              { key: 'recommendations', label: 'Curated Recommendations' },
            ].map(({ key, label }) => {
              const val =
                key === 'mentions'
                  ? settings.notifications.mentions ?? settings.notifications.comments
                  : key === 'followers'
                  ? settings.notifications.followers ?? settings.notifications.follows
                  : key === 'storyReplies'
                  ? settings.notifications.storyReplies ?? settings.notifications.storyActivity
                  : settings.notifications[key as keyof typeof settings.notifications];
              return (
                <button
                  key={key}
                  onClick={() =>
                    updateSettings({
                      notifications: {
                        ...settings.notifications,
                        [key]: !val,
                        ...(key === 'mentions' ? { comments: !val } : {}),
                        ...(key === 'followers' ? { follows: !val } : {}),
                        ...(key === 'storyReplies' ? { storyActivity: !val } : {}),
                      },
                    })
                  }
                  className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 hover:border-stone-700 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <span className="font-medium text-xs text-stone-200">{label}</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      val ? 'bg-white text-black' : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {val ? 'On' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: App Preferences */}
        <section className="bg-[#121212] border border-stone-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-4 h-4 text-white" />
            <h2 className="font-bold text-sm text-stone-100">
              Display & Motion
            </h2>
          </div>
          <p className="text-xs text-stone-400 mb-4">
            Adjust visual pacing and density.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() =>
                updateSettings({
                  preferences: {
                    ...settings.preferences,
                    reducedMotion: !settings.preferences.reducedMotion,
                  },
                })
              }
              className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 hover:border-stone-700 rounded-xl text-left transition-colors cursor-pointer"
            >
              <div>
                <span className="font-medium text-xs text-stone-200 block">
                  Reduced Motion
                </span>
                <span className="text-[11px] text-stone-500">
                  Minimize interface transitions
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  settings.preferences.reducedMotion ? 'bg-white text-black' : 'bg-stone-800 text-stone-500'
                }`}
              >
                {settings.preferences.reducedMotion ? 'On' : 'Off'}
              </span>
            </button>

            <button
              onClick={() =>
                updateSettings({
                  preferences: {
                    ...settings.preferences,
                    compactMode: !(settings.preferences.compactView ?? settings.preferences.compactMode),
                    compactView: !(settings.preferences.compactView ?? settings.preferences.compactMode),
                  },
                })
              }
              className="flex items-center justify-between p-3.5 bg-[#181818] border border-stone-800 hover:border-stone-700 rounded-xl text-left transition-colors cursor-pointer"
            >
              <div>
                <span className="font-medium text-xs text-stone-200 block">
                  Compact View
                </span>
                <span className="text-[11px] text-stone-500">
                  Tighter post density
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (settings.preferences.compactView ?? settings.preferences.compactMode)
                    ? 'bg-white text-black'
                    : 'bg-stone-800 text-stone-500'
                }`}
              >
                {(settings.preferences.compactView ?? settings.preferences.compactMode) ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </section>

        {/* Section 5: Transparency & System Policy */}
        <section className="bg-[#121212] border border-stone-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-white" />
            <h2 className="font-bold text-sm text-stone-100">
              Transparency & Legal Directives
            </h2>
          </div>
          <p className="text-xs text-stone-400 mb-2">
            Orbit platform policies, data privacy terms, and real-time network infrastructure.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('privacy')}
              className="w-full flex items-center justify-between p-3.5 bg-[#181818] hover:bg-[#202020] border border-stone-800 hover:border-stone-700 rounded-xl transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 group-hover:text-white transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200 group-hover:text-white transition-colors">
                    Privacy Policy
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Data minimalism, zero advertising trackers, and user rights
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => setActiveTab('terms')}
              className="w-full flex items-center justify-between p-3.5 bg-[#181818] hover:bg-[#202020] border border-stone-800 hover:border-stone-700 rounded-xl transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 group-hover:text-white transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200 group-hover:text-white transition-colors">
                    Terms of Service
                  </div>
                  <div className="text-[11px] text-stone-500">
                    100% creator ownership, acceptable use, and community conduct
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className="w-full flex items-center justify-between p-3.5 bg-[#181818] hover:bg-[#202020] border border-stone-800 hover:border-stone-700 rounded-xl transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-emerald-400">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200 group-hover:text-white transition-colors flex items-center gap-2">
                    <span>System Status & Telemetry</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-stone-500">
                    All systems operational • Region: asia-south1
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
