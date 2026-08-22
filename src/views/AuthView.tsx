import React, { useState } from 'react';
import { OrbitLogo } from '../components/OrbitLogo';
import { useOrbit } from '../context/OrbitContext';
import { Lock } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { signInWithGoogle, setActiveTab } = useOrbit();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('[ORBIT Auth] Sign in failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="orbit-auth-screen"
      className="min-h-screen w-full bg-[#080808] text-stone-200 flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden"
    >
      {/* Top minimal brand */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <OrbitLogo size="sm" showWordmark={true} />
        </div>
        <div className="text-[11px] font-mono text-stone-500 tracking-[0.2em] uppercase">
          SECURE ACCESS // NODE 2.5
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md mx-auto my-auto flex flex-col items-center text-center py-12">
        {/* Architectural Orbital Glyph */}
        <div className="mb-8 relative flex items-center justify-center">
          <OrbitLogo size="xl" showWordmark={false} />
        </div>

        {/* Headlines */}
        <h1 className="font-serif italic font-medium text-3xl sm:text-4xl text-white tracking-wide mb-3">
          Welcome to your Orbit
        </h1>
        <p className="text-sm text-stone-400 max-w-sm mb-8 leading-relaxed font-sans">
          A high-signal social network for design, software engineering, and intelligence.
        </p>

        {/* Primary Auth Actions */}
        <div className="w-full flex flex-col gap-3">
          {/* Continue with Google */}
          <button
            id="btn-auth-google"
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-4 bg-white hover:bg-stone-200 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {/* Google Vector Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Security badge note */}
        <div className="flex items-center gap-2 text-stone-500 text-xs mt-6">
          <Lock className="w-3.5 h-3.5" />
          <span>Encrypted with Cloud Firestore authentication</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 pt-6 border-t border-stone-900">
        <div>
          <span>ORBIT System © 2026. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('privacy')}
            className="hover:text-stone-300 hover:scale-105 active:scale-95 transition-all cursor-pointer font-medium"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('terms')}
            className="hover:text-stone-300 hover:scale-105 active:scale-95 transition-all cursor-pointer font-medium"
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('status')}
            className="hover:text-stone-300 hover:scale-105 active:scale-95 transition-all cursor-pointer font-medium"
          >
            Status
          </button>
        </div>
      </footer>
    </div>
  );
};
