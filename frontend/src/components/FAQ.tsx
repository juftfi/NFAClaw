'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function FAQ() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: t('faq.q0'), a: t('faq.a0') },
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
  ];

  return (
    <section className="py-24 border-t border-white/5">
      <div className="mb-16">
        <div className="text-gray-500 font-mono text-xs mb-2">{t('faq.label')}</div>
        <h2 className="text-4xl font-display text-white">{t('faq.title')}</h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="border border-white/10 bg-surface transition-all duration-300 hover:border-white/20"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-neon-green text-sm">
                  [{String(idx).padStart(2, '0')}]
                </span>
                <span className="font-mono text-white text-lg">{faq.q}</span>
              </div>
              <span
                className={`font-mono text-neon-green transition-transform duration-300 ${
                  openIndex === idx ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === idx ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-6 pt-0 font-mono text-sm text-gray-400 leading-relaxed border-t border-white/5 mt-2">
                {faq.a}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
