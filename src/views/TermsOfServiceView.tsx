import React from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  AlertTriangle,
  Scale,
  ShieldAlert,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitLogo } from '../components/OrbitLogo';

interface TermsOfServiceViewProps {
  onBack?: () => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({ onBack }) => {
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
      id="orbit-terms-of-service-view"
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
              LEGAL // TERMS
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
            <Scale className="w-3.5 h-3.5 text-stone-300" />
            <span>ORBIT COMMUNITY CONSTITUTION & SERVICE TERMS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif italic text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-stone-400 text-base leading-relaxed max-w-2xl font-light">
            These terms establish the operational rules, conduct expectations, and intellectual property rights governing access to the Orbit network and platform services.
          </p>
        </section>

        {/* Section 1: Acceptance of Terms */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              1. Acceptance of Terms
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              By accessing, browsing, or creating an account within Orbit, you agree to be bound by these Terms of Service, our Privacy Policy, and community safety guidelines. If you do not agree to these terms, you must discontinue use of the Orbit platform.
            </p>
          </div>
        </section>

        {/* Section 2: Acceptable Use & Conduct */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              2. Acceptable Use Policy
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3">
            <p className="text-xs text-stone-300 leading-relaxed">
              Orbit is engineered for purposeful social connection, creative expression, and authentic discussion. You agree not to engage in any prohibited activities:
            </p>
            <ul className="space-y-2 text-xs text-stone-400 list-disc list-inside">
              <li><strong className="text-stone-300 font-medium">Harmful Behavior:</strong> Harassment, hate speech, threats of violence, or deliberate intimidation of other community members.</li>
              <li><strong className="text-stone-300 font-medium">System Exploitation:</strong> Attempting to bypass security rules, inject malicious payloads, scrap data without authorization, or perform denial-of-service actions.</li>
              <li><strong className="text-stone-300 font-medium">Illegal Content:</strong> Distributing unlawful material, copyright-infringing content, or prohibited media.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Content Ownership & Intellectual Property */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              3. Content Ownership & Creator Rights
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              <strong className="text-white font-medium">You retain 100% ownership</strong> of all original text, imagery, designs, media, and articles you publish on Orbit. We claim no ownership over your intellectual property.
            </p>
            <p>
              By posting content on Orbit, you grant Orbit a non-exclusive, worldwide, royalty-free license solely to store, display, format, and transmit your content across the network to facilitate your chosen visibility audiences (Public, Followers Only, or Private).
            </p>
          </div>
        </section>

        {/* Section 4: Anti-Spam & Anti-Impersonation */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              4. Anti-Spam & Anti-Impersonation
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              Maintaining an authentic network of creators is essential to Orbit. We enforce strict penalties for:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-stone-300 font-medium">Impersonation:</strong> Creating accounts intending to deceive others by impersonating another individual, entity, or official Orbit administrator.</li>
              <li><strong className="text-stone-300 font-medium">Automated Spam:</strong> Deploying bots to blast repetitive messages, unprompted promotional links, or fabricated engagement.</li>
              <li><strong className="text-stone-300 font-medium">Deceptive Links:</strong> Sharing phishing URLs or unauthorized affiliate traps in posts or direct messages.</li>
            </ul>
          </div>
        </section>

        {/* Section 5: Account Responsibility */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              5. Account Responsibility & Security
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              You are responsible for maintaining the security of the Google credentials associated with your Orbit account. You agree to immediately notify Orbit administrators if you detect unauthorized access or account compromises.
            </p>
          </div>
        </section>

        {/* Section 6: Platform Moderation & Enforcement */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              6. Platform Moderation Rights
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              Orbit reserves the right, though not the obligation, to review, hide, or remove any content or temporarily restrict accounts that breach these Terms of Service or degrade the safety and trust of the community.
            </p>
          </div>
        </section>

        {/* Section 7: Service Availability & Disclaimers */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-medium text-white tracking-wide">
              7. Service Availability & Disclaimers
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-[#111111] border border-stone-800/80 space-y-3 text-xs text-stone-400 leading-relaxed">
            <p>
              Orbit is provided on an "as is" and "as available" basis. While we strive for 99.9%+ continuous operational uptime, we do not warrant that services will be completely uninterrupted, timely, or error-free during routine maintenance windows.
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
            ORBIT SYSTEM SPECIFICATION // DOC-ID: ORB-TERMS-2026
          </span>
        </div>
      </main>
    </div>
  );
};
