'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const PREVIEW_ITEMS = [
  {
    id: '0042',
    image: '/images/shadow.png',
    traits: {
      Background: 'Night',
      Body: 'Shadow',
      Wings: 'Obsidian',
      Claws: 'Neon Claws',
      Special: 'Cosmic Dust',
    },
  },
  {
    id: '1337',
    image: '/images/blue-lobster.png',
    traits: {
      Background: 'Ocean',
      Body: 'Blue Lobster',
      Wings: 'Ice Crystal',
      Claws: 'Pearl Claws',
      Special: 'Frost Crystals',
    },
  },
  {
    id: '0777',
    image: '/images/classic.png',
    traits: {
      Background: 'Sky Blue',
      Body: 'Classic Red',
      Wings: 'Blue Morpho',
      Claws: 'Crimson Claws',
      Accessory: 'None',
    },
  },
  {
    id: '2048',
    image: '/images/monarch.png',
    traits: {
      Background: 'Forest',
      Body: 'Coral',
      Wings: 'Monarch',
      Pattern: 'Star Pattern',
      Special: 'Sparkle Trail',
    },
  },
  {
    id: '0888',
    image: '/images/golden.png',
    traits: {
      Background: 'Peach',
      Body: 'Golden Shell',
      Wings: 'Golden',
      Claws: 'Golden Claws',
      Accessory: 'Tiny Crown',
    },
  },
];

export function GalleryPreview() {
  const { t } = useLanguage();

  return (
    <section className="py-24 border-t border-white/5">
      <div className="mb-16">
        <div className="text-flap-glow font-mono text-xs mb-2">{t('gallery.label')}</div>
        <h2 className="text-4xl font-display text-white">{t('gallery.title')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {PREVIEW_ITEMS.map((item) => (
          <div
            key={item.id}
            className="group bg-surface border border-white/5 hover:border-flap/50 transition-all duration-300"
          >
            <div className="relative aspect-square overflow-hidden border-b border-white/5">
              <Image
                src={item.image}
                alt={`NFAClaw #${item.id}`}
                fill
                className="object-cover pixelated rendering-pixelated group-hover:scale-110 transition-transform duration-500"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-[10px] font-mono text-white">
                #{item.id}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="font-mono text-sm text-flap-glow">
                NFAClaw #{item.id}
              </div>
              <div className="space-y-1">
                {Object.entries(item.traits).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-[10px] font-mono">
                    <span className="text-gray-500">{key}</span>
                    <span className="text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
