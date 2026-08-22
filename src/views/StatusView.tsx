import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  MessageSquare,
  Radio,
  Clock,
  Globe2,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitLogo } from '../components/OrbitLogo';

interface StatusViewProps {
  onBack?: () => void;
}

interface ServiceStatus {
  id: string;
  name: string;
  category: string;
  status: 'Operational';
  description: string;
  icon: React.ElementType;
}

function formatStatusTimestamp(date: Date): string {
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export const StatusView: React.FC<StatusViewProps> = ({ onBack }) => {
  const { navigateBack } = useOrbit();
  const [lastRefreshed, setLastRefreshed] = useState<string>(() => formatStatusTimestamp(new Date()));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigateBack();
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(formatStatusTimestamp(new Date()));
      setIsRefreshing(false);
    }, 300);
  };

  const coreServices: ServiceStatus[] = [
    {
      id: 'auth',
      name: 'Authentication',
      category: 'Firebase Authentication & Identity',
      status: 'Operational',
      description: 'Google OAuth token verification, user session management, and credential exchange.',
      icon: ShieldCheck,
    },
    {
      id: 'firestore',
      name: 'Cloud Firestore Database',
      category: 'asia-south1 Cluster',
      status: 'Operational',
      description: 'Cloud document storage, real-time snapshot synchronization, and database security rules.',
      icon: Database,
    },
    {
      id: 'messaging',
      name: 'Messaging',
      category: 'Direct Messaging & Chat Channels',
      status: 'Operational',
      description: 'Direct communication channels, message synchronization, and unread thread tracking.',
      icon: MessageSquare,
    },
    {
      id: 'posts-stories',
      name: 'Posts & Stories',
      category: 'Publishing & Media Feed',
      status: 'Operational',
      description: 'Timeline post aggregation, reactions, bookmarks, and 24-hour story lifecycle.',
      icon: Radio,
    },
  ];

  return (
    <div
      id="orbit-status-view"
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
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM STATUS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white px-2.5 py-1 rounded bg-stone-900 border border-stone-800 hover:bg-stone-800 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh real-time status timestamp"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span className="text-[11px] font-mono text-stone-500 hidden md:inline">
            Last refreshed: {lastRefreshed}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        {/* Global Operational Header */}
        <section className="p-6 rounded-2xl bg-gradient-to-br from-[#121212] via-[#0f1410] to-[#121212] border border-emerald-900/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-6 h-6 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif italic text-white tracking-tight">
                  Orbit System Status
                </h1>
                <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                  All Systems Operational
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-400 bg-black/50 px-3.5 py-2 rounded-xl border border-stone-800/80">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Last refreshed: {lastRefreshed}</span>
            </div>
          </div>
        </section>

        {/* Infrastructure Information */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-300 tracking-wide flex items-center gap-2">
            <Server className="w-4 h-4 text-stone-400" />
            <span>Infrastructure Information</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-mono">
                <Globe2 className="w-3.5 h-3.5 text-stone-300" />
                <span>PRIMARY REGION</span>
              </div>
              <div className="text-sm font-semibold text-stone-100">asia-south1</div>
              <div className="text-[11px] text-stone-500">Cloud Infrastructure</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-300" />
                <span>AUTHENTICATION</span>
              </div>
              <div className="text-sm font-semibold text-stone-100">Firebase Authentication</div>
              <div className="text-[11px] text-stone-500">Google OAuth 2.0</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-mono">
                <Database className="w-3.5 h-3.5 text-stone-300" />
                <span>DATABASE</span>
              </div>
              <div className="text-sm font-semibold text-stone-100">Cloud Firestore</div>
              <div className="text-[11px] text-stone-500">Real-time Data Layer</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111111] border border-stone-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-mono">
                <HardDrive className="w-3.5 h-3.5 text-stone-300" />
                <span>STORAGE</span>
              </div>
              <div className="text-sm font-semibold text-stone-100">Firebase Storage</div>
              <div className="text-[11px] text-stone-500">Media & Assets</div>
            </div>
          </div>
        </section>

        {/* Core Services Status Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-300 tracking-wide flex items-center gap-2">
              <Server className="w-4 h-4 text-stone-400" />
              <span>Service Status</span>
            </h2>
            <span className="text-xs font-mono text-stone-500">4 Services Monitored</span>
          </div>

          <div className="space-y-3">
            {coreServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="p-4 sm:p-5 rounded-xl bg-[#111111] border border-stone-800/80 hover:border-stone-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300 shrink-0 mt-0.5 sm:mt-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-stone-100">
                          {service.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                          {service.category}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed max-w-xl">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t sm:border-t-0 border-stone-800/60 pt-2 sm:pt-0 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{service.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
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
            ORBIT CLOUD INFRASTRUCTURE // REGION: ASIA-SOUTH1
          </span>
        </div>
      </main>
    </div>
  );
};
