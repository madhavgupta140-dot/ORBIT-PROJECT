import React, { useEffect } from 'react';
import { OrbitProvider, useOrbit } from './context/OrbitContext';
import { OrbitSidebar } from './components/OrbitSidebar';
import { SignalPanel } from './components/SignalPanel';
import { CreatePostModal } from './components/CreatePostModal';
import { StoryCreatorModal } from './components/StoryCreatorModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { EditProfileModal } from './components/EditProfileModal';
import { SearchOverlay } from './components/SearchOverlay';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NewMessageModal } from './components/NewMessageModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ToastContainer } from './components/ToastContainer';
import { OrbitLogo } from './components/OrbitLogo';
import { AuthView } from './views/AuthView';

import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { MessagesView } from './views/MessagesView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsOfServiceView } from './views/TermsOfServiceView';
import { StatusView } from './views/StatusView';

const OrbitAppContent: React.FC = () => {
  const { activeTab, setActiveTab, authUser, isAuthReady, openSearch, openCreatePost } = useOrbit();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openCreatePost();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch, openCreatePost]);

  // Loading state while Firebase auth status is resolving
  if (!isAuthReady) {
    return (
      <div className="min-h-screen w-full bg-[#080808] text-stone-200 flex flex-col items-center justify-center p-6 select-none">
        <OrbitLogo size="lg" showWordmark={false} className="animate-pulse mb-4" />
        <div className="text-xs font-mono tracking-[0.2em] text-stone-500 uppercase">
          ORBIT SYSTEM // INITIALIZING
        </div>
      </div>
    );
  }

  // If not signed in, allow viewing legal and status pages, otherwise show AuthView
  if (!authUser) {
    if (activeTab === 'privacy') {
      return (
        <>
          <PrivacyPolicyView onBack={() => setActiveTab('home')} />
          <ToastContainer />
        </>
      );
    }
    if (activeTab === 'terms') {
      return (
        <>
          <TermsOfServiceView onBack={() => setActiveTab('home')} />
          <ToastContainer />
        </>
      );
    }
    if (activeTab === 'status') {
      return (
        <>
          <StatusView onBack={() => setActiveTab('home')} />
          <ToastContainer />
        </>
      );
    }

    return (
      <>
        <AuthView />
        <ToastContainer />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView />;
      case 'explore':
        return <ExploreView />;
      case 'messages':
        return <MessagesView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      case 'privacy':
        return <PrivacyPolicyView />;
      case 'terms':
        return <TermsOfServiceView />;
      case 'status':
        return <StatusView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div id="orbit-root-layout" className="min-h-screen bg-[#0a0a0a] text-stone-200 flex font-sans">
      {/* 1. Left Navigation Rail (Fixed) */}
      <OrbitSidebar />

      {/* 2. Center Content Area */}
      <div className="flex-1 flex flex-col md:ml-[72px] lg:ml-[240px] overflow-x-hidden min-h-screen pb-16 md:pb-0">
        {/* View Switcher Container */}
        <main className="flex-1 flex flex-col">
          {renderActiveView()}
        </main>
      </div>

      {/* 3. Right Signal Telemetry Rail (Desktop) */}
      <div className="hidden xl:block">
        <SignalPanel />
      </div>

      {/* All Overlay Modals and Drawers */}
      <CreatePostModal />
      <StoryCreatorModal />
      <StoryViewerModal />
      <EditProfileModal />
      <SearchOverlay />
      <NotificationDrawer />
      <NewMessageModal />
      <UserProfileModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <OrbitProvider>
      <OrbitAppContent />
    </OrbitProvider>
  );
}
