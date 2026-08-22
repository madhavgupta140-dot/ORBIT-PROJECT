import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Database,
  Lock,
  EyeOff,
  UserCheck,
  FileCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitLogo } from '../components/OrbitLogo';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  const { navigateBack } = useOrbit();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigateBack();
    }
  };

  return (
    <div
      id="orbit-privacy-policy-view"
      className="min-h-screen w-full bg-[#0a0a0a] text-stone-200 flex flex-col font-sans"
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-stone-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-all text-xs font-medium cursor-pointer"
            aria-label="Go back to previous screen"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-stone-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <OrbitLogo size="sm" showWordmark={true} />
            <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase px-2 py-0.5 rounded bg-stone-900 border border-stone-800">
              LEGAL // PRIVACY
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-stone-500">
            Last Updated: August 22, 2026
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Document Header */}
        <section className="space-y-4 pb-6 border-b border-stone-800/80">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-stone-400 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-300" />
            <span>ORBIT PRIVACY DIRECTIVE & DATA POLICY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif italic text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-stone-400 text-base leading-relaxed max-w-2xl font-light">
            Orbit is built on principles of intentional communication, strict data minimalism, and absolute transparency. This document explains what information is collected, how it is safeguarded, and the controls available to you.
          </p>
        </section>

        {/* Section 1: Data Orbit Collects */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              1. Information Orbit Collects
            </h2>
          </div>
          <p className="text-stone-400 text-sm leading-relaxed">
            Orbit collects only the minimal data required to authenticate your identity, host your transmissions, and facilitate conversations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-2">
              <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Google Authentication Profile
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                When connecting via Google, Orbit receives your full display name, verified email address, Google account avatar URL, and authenticated user ID.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-2">
              <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Public Profile Attributes
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Your customizable username, bio, country location, website URL, interest tags, and visual header banner saved in your profile settings.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-2">
              <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                User-Authored Transmissions
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Public and follower-scoped posts, media attachments, 24-hour transient stories, replies, reactions (likes), bookmarks, and reposts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-2">
              <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Direct Communications
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Encrypted direct messages exchanged strictly between authorized conversational participants, along with read receipts and active thread IDs.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: What Orbit NEVER Collects */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <EyeOff className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              2. What Orbit Does NOT Collect
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3">
            <p className="text-sm text-stone-300 leading-relaxed">
              We strictly reject invasive data mining and commercial user profiling. Orbit explicitly does <strong className="text-white font-medium">NOT</strong> collect, scrape, or process:
            </p>
            <ul className="space-y-2 text-xs text-stone-400 list-disc list-inside">
              <li><strong className="text-stone-300 font-medium">No Phone Numbers or SMS:</strong> Orbit never requests, stores, or utilizes cellular telephone numbers.</li>
              <li><strong className="text-stone-300 font-medium">No Address Books or Contacts:</strong> We never scan or synchronize contacts from your device.</li>
              <li><strong className="text-stone-300 font-medium">No Background Geolocation:</strong> We never log GPS coordinates or continuous background movement.</li>
              <li><strong className="text-stone-300 font-medium">No Advertising Trackers or Pixels:</strong> We do not deploy third-party advertising SDKs, ad trackers, or pixel beacons.</li>
              <li><strong className="text-stone-300 font-medium">No Data Brokering:</strong> Your personal information and communications are never sold, leased, or rented to any third party.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Storage & Infrastructure */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              3. Data Storage & Architecture
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-4">
            <p className="text-sm text-stone-400 leading-relaxed">
              All Orbit platform data is stored and orchestrated via enterprise cloud infrastructure:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-300">
              <div className="p-3 rounded-lg bg-stone-900/60 border border-stone-800">
                <span className="font-mono text-stone-400 block mb-1">AUTHENTICATION</span>
                <span>Firebase Authentication with OAuth 2.0 Google Identity tokens.</span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900/60 border border-stone-800">
                <span className="font-mono text-stone-400 block mb-1">DATABASE CLOUD</span>
                <span>Google Cloud Firestore deployed in primary region <code className="text-stone-200">asia-south1</code>.</span>
              </div>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Firestore Security Rules strictly govern read and write access on every database collection. User settings, follower rosters, and private messages are mathematically gated by authenticated User IDs (`request.auth.uid`).
            </p>
          </div>
        </section>

        {/* Section 4: User Rights & Granular Privacy Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <UserCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              4. User Rights & Privacy Controls
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3">
            <p className="text-sm text-stone-300 leading-relaxed">
              You retain full ownership and control over your presence in the Orbit network:
            </p>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
                <span><strong className="text-stone-200 font-medium">Profile Discoverability:</strong> Choose between Public, Followers Only, or Private visibility in your Settings panel.</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
                <span><strong className="text-stone-200 font-medium">Direct Message Reach:</strong> Restrict who can initiate direct conversations (Everyone, Followers, or None).</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
                <span><strong className="text-stone-200 font-medium">Instant Editing & Deletion:</strong> Modify your profile, delete any created posts, and clear notifications at any time.</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
                <span><strong className="text-stone-200 font-medium">Account Erasure:</strong> Request complete account deletion and data purge across all connected database indexes.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Security Statement */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              5. Security Statement
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              Authentication is provided through Firebase Authentication. User data is transmitted securely over HTTPS/TLS and stored in Cloud Firestore. No passwords or plain-text secrets are stored in our systems.
            </p>
            <p>
              If you identify potential vulnerabilities or have inquiries regarding our data handling standards, contact our security team via the Orbit support network.
            </p>
          </div>
        </section>

        {/* Footer Navigation Back */}
        <div className="pt-6 pb-12 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-stone-200 text-black text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Orbit</span>
          </button>
          <span className="text-[11px] font-mono text-stone-500">
            ORBIT SYSTEM SPECIFICATION // DOC-ID: ORB-PRIV-2026
          </span>
        </div>
      </main>
    </div>
  );
};
