'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { WalletConnect } from './WalletConnect';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="NFAClaw"
            width={28}
            height={28}
            className="rounded-sm"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
          <div className="font-mono text-xs tracking-widest text-gray-500 hidden sm:block">
            {t('header.network')}{' '}
            <span className="mx-2 text-gray-700">//</span>{' '}
            {t('header.project')}{' '}
            <span className="mx-2 text-gray-700">//</span>{' '}
            {t('header.type')}
          </div>
        </div>

        {/* Nav & Controls */}
        <div className="flex items-center gap-4 lg:gap-6">
          <nav className="hidden md:flex items-center gap-6 font-mono text-xs uppercase tracking-wider">
            <Link
              href="/"
              className="text-white hover:text-neon-green transition-colors"
            >
              {t('header.terminal')}
            </Link>
            <Link
              href="/my-nfa"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {t('header.myAgents')}
            </Link>
            <Link
              href="/chat"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {t('header.comms')}
            </Link>
          </nav>
          <LanguageSwitcher />
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
