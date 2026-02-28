'use client';

import Image from 'next/image';
import { MiningPanel } from '@/components/MiningPanel';
import { NFACard } from '@/components/NFACard';
import { HowItWorks } from '@/components/HowItWorks';
import { GalleryPreview } from '@/components/GalleryPreview';
import { CollectionDetails } from '@/components/CollectionDetails';
import { FAQ } from '@/components/FAQ';
import { DecryptedText } from '@/components/animations/DecryptedText';
import { FadeIn } from '@/components/animations/FadeIn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useNFAMiner } from '@/hooks/useNFAMiner';

export default function Home() {
  const { t } = useLanguage();
  const { totalSupply } = useNFAMiner();
  const mintedDisplay = `${(totalSupply ?? 0n).toString()} / 7,777`;

  const showcaseNFAs = [
    { id: '0042', name: 'Shadow Agent', image: '/images/shadow.png', color: 'green' as const },
    { id: '1337', name: 'Blue Lobster', image: '/images/blue-lobster.png', color: 'purple' as const },
    { id: '0777', name: 'Classic Red', image: '/images/classic.png', color: 'green' as const },
    { id: '2048', name: 'Monarch', image: '/images/monarch.png', color: 'purple' as const },
  ];

  return (
    <div className="space-y-32">

      {/* Logo Banner */}
      <FadeIn direction="down" delay={0}>
        <div className="flex justify-center -mb-20">
          <div className="relative w-[280px] h-[160px] md:w-[400px] md:h-[220px] opacity-90">
            <Image
              src="/images/logo.png"
              alt="NFAClaw"
              fill
              className="object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]"
              priority
            />
          </div>
        </div>
      </FadeIn>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">

        {/* Left Column: Info & Mining */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-12">

          {/* Hero Text */}
          <FadeIn direction="right" delay={0.2} className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-mono text-sm text-flap-glow tracking-widest uppercase">
                <DecryptedText text={t('hero.supply')} speed={30} />
              </h2>
              <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-flap-glow animate-glow font-display">
                <DecryptedText text={t('hero.title')} speed={60} />
              </h1>
            </div>

            <p className="font-mono text-gray-400 text-sm md:text-base leading-relaxed max-w-md">
              <DecryptedText text={t('hero.description')} speed={20} />
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10 max-w-md">
              <div className="bg-black p-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  {t('hero.price')}
                </div>
                <div className="font-mono text-neon-green">0.01 BNB</div>
              </div>
              <div className="bg-black p-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  {t('hero.minted')}
                </div>
                <div className="font-mono text-white">{mintedDisplay}</div>
              </div>
              <div className="bg-black p-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  {t('hero.access')}
                </div>
                <div className="font-mono text-flap-glow">{t('hero.accessValue')}</div>
              </div>
            </div>

            {/* Minting Guide (replaced the old AI agent curl command) */}
            <div className="bg-black/50 border border-white/10 p-4 rounded-sm backdrop-blur-sm">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t('hero.guideTitle')}
              </div>
              <div className="font-mono text-sm text-gray-300 mb-3">
                <span className="text-neon-green">$</span>{' '}
                <DecryptedText
                  text={t('hero.guideCmd')}
                  speed={30}
                  animateOn="view"
                />
              </div>
              <div className="space-y-1 font-mono text-[10px] text-gray-500">
                <div>{t('hero.guideStep1')}</div>
                <div>{t('hero.guideStep2')}</div>
                <div>{t('hero.guideStep3')}</div>
                <div className="text-neon-green">{t('hero.guideSuccess')}</div>
              </div>
            </div>
          </FadeIn>

          {/* Mining Interface */}
          <FadeIn direction="up" delay={0.4}>
            <MiningPanel />
          </FadeIn>
        </div>

        {/* Right Column: Visual Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {showcaseNFAs.map((nfa, index) => (
              <FadeIn key={nfa.id} direction="left" delay={0.2 + index * 0.1} className="h-full">
                <NFACard
                  id={nfa.id}
                  name={nfa.name}
                  imageUrl={nfa.image}
                  color={nfa.color}
                />
              </FadeIn>
            ))}
          </div>

          <FadeIn direction="up" delay={0.8} className="mt-6 text-center">
            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em]">
              {t('hero.previewNote')}
            </p>
          </FadeIn>
        </div>
      </div>

      {/* How It Works Section */}
      <FadeIn direction="up" delay={0.2}>
        <HowItWorks />
      </FadeIn>

      {/* Gallery Preview Section */}
      <FadeIn direction="up" delay={0.2}>
        <GalleryPreview />
      </FadeIn>

      {/* Collection Details Section */}
      <FadeIn direction="up" delay={0.2}>
        <CollectionDetails />
      </FadeIn>

      {/* FAQ Section */}
      <FadeIn direction="up" delay={0.2}>
        <FAQ />
      </FadeIn>
    </div>
  );
}
