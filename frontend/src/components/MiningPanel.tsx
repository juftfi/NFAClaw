'use client';

import { useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useAccount, usePublicClient } from 'wagmi';
import { encodePacked, keccak256 } from 'viem';
import { DecryptedText } from './animations/DecryptedText';
import { useNFAMiner } from '@/hooks/useNFAMiner';
import { MINER_ABI } from '@/lib/contracts';
import { appConfig } from '@/lib/config';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const MIN_ANIMATION_SEC = 9;
const MAX_ANIMATION_SEC = 27;

export function MiningPanel() {
  const { t } = useLanguage();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { mineWithNonce, mintNfa, pendingMineQuery, isPending } = useNFAMiner();
  const [logs, setLogs] = useState<string[]>([
    '> Initializing connection...',
    '> Checking mining runtime...',
    '> Ready to mint.',
  ]);
  const [isMining, setIsMining] = useState(false);
  const [error, setError] = useState('');
  const progressRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const animationSeconds = useMemo(() => {
    const range = MAX_ANIMATION_SEC - MIN_ANIMATION_SEC;
    return MIN_ANIMATION_SEC + Math.floor(Math.random() * (range + 1));
  }, [isMining]);

  const runAnimation = () =>
    new Promise<void>((resolve) => {
      if (!progressRef.current) {
        resolve();
        return;
      }
      gsap.set(progressRef.current, { width: '0%' });
      const tl = gsap.timeline({
        onComplete: () => resolve(),
      });
      timelineRef.current = tl;
      tl.to(progressRef.current, {
        width: '100%',
        duration: animationSeconds,
        ease: 'none',
      });
      tl.call(() => setLogs((prev) => [...prev, '> Hashing block... 25%']));
      tl.call(
        () => setLogs((prev) => [...prev, '> Hashing block... 50%']),
        [],
        animationSeconds * 0.5,
      );
      tl.call(
        () => setLogs((prev) => [...prev, '> Hashing block... 75%']),
        [],
        animationSeconds * 0.75,
      );
    });

  const findNonce = async (
    blockNumber: bigint,
    blockHash: `0x${string}`,
    target: bigint,
  ) => {
    let nonce = 0n;
    let iterations = 0;
    const start = Date.now();

    while (true) {
      const hash = keccak256(
        encodePacked(
          ['address', 'uint256', 'bytes32', 'uint256'],
          [address as `0x${string}`, blockNumber, blockHash, nonce],
        ),
      );
      if (BigInt(hash) <= target) {
        return { nonce, elapsedMs: Date.now() - start };
      }

      nonce += 1n;
      iterations += 1;
      if (iterations % 5000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  };

  const startMining = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!publicClient) {
      setError('Missing public client');
      return;
    }

    setError('');
    setIsMining(true);
    setLogs([
      '> Mining sequence initiated...',
      `> Estimated runtime: ${animationSeconds}s`,
      '> Preparing PoW challenge...',
    ]);

    try {
      const pending = pendingMineQuery.data as { exists: boolean } | undefined;
      if (!pending?.exists) {
        const [block, powTargetRaw] = await Promise.all([
          publicClient.getBlock(),
          publicClient.readContract({
            abi: MINER_ABI,
            address: appConfig.minerAddress,
            functionName: 'powTarget',
          }),
        ]);

        const blockNumber = block.number;
        const blockHash = block.hash as `0x${string}`;
        const powTarget = BigInt(powTargetRaw as bigint);

        if (!blockHash) {
          throw new Error('block hash unavailable');
        }

        setLogs((prev) => [
          ...prev,
          `> PoW target ready (block ${blockNumber}).`,
        ]);

        const [powResult] = await Promise.all([
          findNonce(blockNumber, blockHash, powTarget),
          runAnimation(),
        ]);

        const latestBlock = await publicClient.getBlockNumber();
        if (latestBlock - blockNumber > 200n) {
          setLogs((prev) => [
            ...prev,
            '> PoW expired. Rebuilding with fresh block...',
          ]);
          const fresh = await publicClient.getBlock();
          const freshHash = fresh.hash as `0x${string}`;
          if (!freshHash) {
            throw new Error('fresh block hash unavailable');
          }
          const refreshed = await findNonce(fresh.number, freshHash, powTarget);
          setLogs((prev) => [
            ...prev,
            `> PoW solved in ${Math.round(refreshed.elapsedMs / 1000)}s.`,
          ]);
          setLogs((prev) => [
            ...prev,
            '> Submitting mineWithNonce() transaction...',
          ]);
          const mineHash = await mineWithNonce(fresh.number, refreshed.nonce);
          await publicClient.waitForTransactionReceipt({ hash: mineHash });
        } else {
          setLogs((prev) => [
            ...prev,
            `> PoW solved in ${Math.round(powResult.elapsedMs / 1000)}s.`,
          ]);
          setLogs((prev) => [
            ...prev,
            '> Submitting mineWithNonce() transaction...',
          ]);
          const mineHash = await mineWithNonce(blockNumber, powResult.nonce);
          await publicClient.waitForTransactionReceipt({ hash: mineHash });
        }

        await pendingMineQuery.refetch();
        setLogs((prev) => [
          ...prev,
          '> mineWithNonce() confirmed. Pending reward locked.',
        ]);
      } else {
        setLogs((prev) => [...prev, '> Pending mine found. Skipping mine().']);
        await runAnimation();
      }

      setLogs((prev) => [...prev, '> Mining animation complete.']);

      setLogs((prev) => [...prev, '> Submitting mintNFA() transaction...']);
      const mintHash = await mintNfa('');
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      await pendingMineQuery.refetch();
      setLogs((prev) => [
        ...prev,
        '> Mint confirmed. Reward delivered.',
        '> Ready for next cycle.',
      ]);
    } catch (err) {
      setLogs((prev) => [...prev, '> Flow interrupted.']);
      setError(err instanceof Error ? err.message : 'transaction failed');
    } finally {
      timelineRef.current?.kill();
      timelineRef.current = null;
      setIsMining(false);
    }
  };

  return (
    <div className="w-full border border-white/10 bg-black/50 backdrop-blur-md p-4 md:p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neon-green rounded-full animate-pulse" />
          <span className="font-mono text-neon-green text-xs md:text-sm uppercase tracking-widest">
            <DecryptedText text={t('mining.status')} speed={50} />
          </span>
        </div>
        <div className="font-mono text-[10px] md:text-xs text-gray-500">
          v1.0.4-beta
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <div className="space-y-6">
          <div>
            <h3 className="font-mono text-white text-base md:text-lg mb-2">
              {t('mining.title')}
            </h3>
            <p className="font-mono text-sm text-gray-400 leading-relaxed">
              {t('mining.description')}
            </p>
          </div>

          <div className="space-y-2 font-mono text-xs text-flap-glow">
            <p>{t('mining.step1')}</p>
            <p>{t('mining.step2')}</p>
            <p className="text-neon-green">{t('mining.rewardsActive')}</p>
          </div>

          <button
            onClick={startMining}
            disabled={isMining || isPending}
            className={`w-full py-4 font-mono text-xs md:text-sm uppercase tracking-widest transition-all
              ${
                isMining || isPending
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  : 'bg-neon-green/10 text-neon-green border border-neon-green hover:bg-neon-green hover:text-black hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              }`}
          >
            {isMining || isPending ? t('mining.minting') : t('mining.mintButton')}
          </button>
        </div>

        {/* Right: Terminal */}
        <div className="bg-black border border-white/10 p-3 md:p-4 font-mono text-xs h-[180px] md:h-[200px] overflow-y-auto flex flex-col-reverse">
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-green-500/80">
                <DecryptedText text={log} speed={20} animateOn="view" />
              </div>
            ))}
            {isMining && (
              <div className="mt-2 w-full bg-gray-900 h-1">
                <div
                  ref={progressRef}
                  className="bg-neon-green h-full w-0"
                />
              </div>
            )}
            {error ? (
              <div className="text-red-400">{`> Error: ${error}`}</div>
            ) : null}
            <div className="animate-pulse text-neon-green">_</div>
          </div>
        </div>
      </div>

      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-neon-green" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-neon-green" />
    </div>
  );
}
