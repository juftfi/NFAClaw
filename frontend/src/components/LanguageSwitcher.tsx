'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { localeLabels, type Locale } from '@/lib/i18n/translations';

const locales: Locale[] = ['en', 'zh-CN', 'zh-TW'];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center border border-white/10 bg-surface overflow-hidden">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-3 py-1.5 font-mono text-[11px] tracking-wider transition-colors ${
            locale === l
              ? 'bg-neon-green/20 text-neon-green'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}
