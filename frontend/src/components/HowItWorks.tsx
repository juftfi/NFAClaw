'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="py-24 border-t border-white/5">
      <div className="mb-16">
        <div className="text-neon-green font-mono text-xs mb-2">{t('howItWorks.label')}</div>
        <h2 className="text-4xl font-display text-white">{t('howItWorks.title')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Step 1 — Connect Wallet */}
        <div className="space-y-6 group">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <span className="font-mono text-2xl text-gray-600 group-hover:text-neon-green transition-colors">
              01
            </span>
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-neon-green/20 transition-colors">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-neon-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-display text-white">{t('howItWorks.step1Title')}</h3>
          <p className="text-gray-400 text-sm leading-relaxed min-h-[48px]">
            {t('howItWorks.step1Desc')}
          </p>
          <div className="bg-black border border-white/10 p-3 font-mono text-xs text-gray-400 rounded">
            <span className="text-neon-green">$</span> {t('howItWorks.step1Cmd').replace('$ ', '')}
          </div>
        </div>

        {/* Step 2 — PoW Mining */}
        <div className="space-y-6 group">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <span className="font-mono text-2xl text-gray-600 group-hover:text-flap-glow transition-colors">
              02
            </span>
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-flap-glow/20 transition-colors">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-flap-glow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-display text-white">{t('howItWorks.step2Title')}</h3>
          <p className="text-gray-400 text-sm leading-relaxed min-h-[48px]">
            {t('howItWorks.step2Desc')}
          </p>
          <div className="bg-black border border-white/10 p-3 font-mono text-xs text-gray-400 rounded">
            <span className="text-flap-glow">$</span> {t('howItWorks.step2Cmd').replace('$ ', '')}
          </div>
        </div>

        {/* Step 3 — Mint & Earn */}
        <div className="space-y-6 group">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <span className="font-mono text-2xl text-gray-600 group-hover:text-white transition-colors">
              03
            </span>
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-display text-white">{t('howItWorks.step3Title')}</h3>
          <p className="text-gray-400 text-sm leading-relaxed min-h-[48px]">
            {t('howItWorks.step3Desc')}
          </p>
          <div className="bg-black border border-white/10 p-3 font-mono text-xs text-gray-400 rounded">
            <span className="text-neon-green">✓</span> {t('howItWorks.step3Cmd').replace('✓ ', '')}
          </div>
        </div>
      </div>
    </section>
  );
}
