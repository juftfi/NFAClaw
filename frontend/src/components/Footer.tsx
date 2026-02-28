'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative z-10 border-t border-white/5 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center font-mono text-xs text-gray-600">
        <div>{t('footer.copyright')}</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-neon-green transition-colors">
            {t('footer.docs')}
          </a>
          <a href="#" className="hover:text-neon-green transition-colors">
            {t('footer.contract')}
          </a>
          <a href="#" className="hover:text-neon-green transition-colors">
            {t('footer.twitter')}
          </a>
        </div>
      </div>
    </footer>
  );
}
