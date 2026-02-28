'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export function CollectionDetails() {
  const { t } = useLanguage();

  const traits = [
    { nameKey: 'collection.background', count: 12, color: 'bg-neon-green', progress: 72 },
    { nameKey: 'collection.body', count: 8, color: 'bg-flap', progress: 58 },
    { nameKey: 'collection.wings', count: 16, color: 'bg-blue-500', progress: 86 },
    { nameKey: 'collection.claws', count: 10, color: 'bg-yellow-500', progress: 64 },
    { nameKey: 'collection.eyes', count: 14, color: 'bg-red-500', progress: 78 },
    { nameKey: 'collection.accessories', count: 20, color: 'bg-purple-500', progress: 92 },
  ];

  return (
    <section className="py-24 border-t border-white/5">
      <div className="mb-16">
        <div className="text-neon-green font-mono text-xs mb-2">{t('collection.label')}</div>
        <h2 className="text-4xl font-display text-white">{t('collection.title')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Traits Stats */}
        <div className="bg-surface border border-white/5 p-8">
          <h3 className="font-mono text-sm text-gray-500 uppercase tracking-widest mb-6">
            {t('collection.traitCategories')}
          </h3>
          <div className="space-y-6">
            {traits.map((trait) => (
              <div key={trait.nameKey} className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{t(trait.nameKey)}</span>
                  <span className="text-white">
                    {trait.count} {t('collection.variants')}
                  </span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${trait.color}`}
                    style={{ width: `${trait.progress}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
              <span className="font-mono text-xs text-gray-500">{t('collection.totalTraits')}</span>
              <span className="font-mono text-xl text-white">80+</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-white/5 p-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('collection.totalSupply')}
              </div>
              <div className="font-display text-3xl text-white">7,777</div>
            </div>
            <div className="bg-surface border border-white/5 p-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('collection.symbol')}
              </div>
              <div className="font-display text-3xl text-flap-glow">$NFACLAW</div>
            </div>
            <div className="bg-surface border border-white/5 p-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('collection.royalties')}
              </div>
              <div className="font-display text-3xl text-white">5%</div>
            </div>
            <div className="bg-surface border border-white/5 p-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('collection.mintPrice')}
              </div>
              <div className="font-display text-3xl text-neon-green">0.01 BNB</div>
            </div>
            <div className="bg-surface border border-white/5 p-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('collection.blockchain')}
              </div>
              <div className="font-display text-3xl text-white">BSC</div>
            </div>
            <div className="bg-surface border border-white/5 p-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('collection.standard')}
              </div>
              <div className="font-display text-3xl text-white">ERC-721</div>
            </div>
          </div>

          <div className="bg-flap/5 border border-flap/20 p-6">
            <p className="font-mono text-sm text-flap-glow leading-relaxed">
              {t('collection.traitNote')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
