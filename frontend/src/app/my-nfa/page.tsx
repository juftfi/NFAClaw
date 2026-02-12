'use client';

import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { useReadContract, useAccount, usePublicClient } from 'wagmi';

import { DIVIDEND_ABI, ERC20_ABI, MINER_ABI } from '@/lib/contracts';
import { appConfig, isConfigured } from '@/lib/config';
import { useOwnedNfas } from '@/hooks/useOwnedNfas';
import { useDividend } from '@/hooks/useDividend';
import { NFACard } from '@/components/NFACard';

type CardColor = 'green' | 'purple' | 'blue';
type CardMetadata = {
  imageUrl: string;
  name: string;
  color: CardColor;
};

const FALLBACK_IMAGES = [
  '/images/shadow.png',
  '/images/blue-lobster.png',
  '/images/classic.png',
  '/images/monarch.png',
  '/images/golden.png'
];
const FALLBACK_NAMES = ['Shadow Agent', 'Blue Lobster', 'Classic Red', 'Monarch', 'Golden Shell'];
const FALLBACK_COLORS: CardColor[] = ['green', 'purple', 'green', 'purple', 'green'];

function getFallbackMetadata(id: string): CardMetadata {
  const index = Number(id) % FALLBACK_IMAGES.length;
  return {
    imageUrl: FALLBACK_IMAGES[index],
    name: FALLBACK_NAMES[index],
    color: FALLBACK_COLORS[index]
  };
}

function normalizeIpfsUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed.startsWith('ipfs://')) return trimmed;
  const secondIpfs = trimmed.indexOf('ipfs://', 7);
  return secondIpfs > -1 ? trimmed.slice(secondIpfs) : trimmed;
}

function ipfsToHttp(uri: string, gatewayBase: string): string {
  if (!uri.startsWith('ipfs://')) return uri;
  const path = uri.replace('ipfs://', '').replace(/^ipfs\//, '');
  return `${gatewayBase.replace(/\/$/, '')}/${path}`;
}

function splitIpfsUri(uri: string): { cid: string; path: string } | null {
  if (!uri.startsWith('ipfs://')) return null;
  const cleaned = uri.replace('ipfs://', '').replace(/^ipfs\//, '');
  const slash = cleaned.indexOf('/');
  if (slash === -1) return { cid: cleaned, path: '' };
  return {
    cid: cleaned.slice(0, slash),
    path: cleaned.slice(slash + 1)
  };
}

function metadataUrls(tokenUri: string, gateways: string[], tokenId: string): string[] {
  if (!tokenUri.startsWith('ipfs://')) return [tokenUri];
  const direct = gateways.map((gateway) => ipfsToHttp(tokenUri, gateway));
  const parsed = splitIpfsUri(tokenUri);
  if (!parsed) return direct;

  const alternatives = parsed.path.endsWith('.json') && !parsed.path.startsWith('metadata-ipfs/')
    ? gateways.map(
        (gateway) => `${gateway.replace(/\/$/, '')}/${parsed.cid}/metadata-ipfs/${tokenId}.json`
      )
    : [];

  return Array.from(new Set([...direct, ...alternatives]));
}

function imageUrls(imageUri: string, gateways: string[]): string[] {
  const normalized = normalizeIpfsUri(imageUri);
  if (!normalized.startsWith('ipfs://')) return [normalized];
  const parsed = splitIpfsUri(normalized);
  if (!parsed) return gateways.map((gateway) => ipfsToHttp(normalized, gateway));

  const direct = gateways.map((gateway) => ipfsToHttp(normalized, gateway));
  const withImagesPrefix = !parsed.path.startsWith('images/') && parsed.path.length > 0
    ? gateways.map(
        (gateway) => `${gateway.replace(/\/$/, '')}/${parsed.cid}/images/${parsed.path}`
      )
    : [];

  return Array.from(new Set([...direct, ...withImagesPrefix]));
}

export default function MyNfaPage() {
  const [claimError, setClaimError] = useState('');
  const [metadataByTokenId, setMetadataByTokenId] = useState<Record<string, CardMetadata>>({});
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { tokenIds, loading, error: ownedNfaError } = useOwnedNfas();
  const { pendingDividend, claimDividend, isPending } = useDividend();
  const zeroAddress = '0x0000000000000000000000000000000000000000' as const;

  const dividendRewardToken = useReadContract({
    abi: DIVIDEND_ABI,
    address: appConfig.dividendAddress,
    functionName: 'rewardToken',
    query: {
      enabled: isConfigured.dividend
    }
  });

  const isNativeDividend = (dividendRewardToken.data || zeroAddress) === zeroAddress;
  const dividendTokenAddress = (dividendRewardToken.data || appConfig.tokenAddress) as `0x${string}`;

  const dividendTokenSymbol = useReadContract({
    abi: ERC20_ABI,
    address: dividendTokenAddress,
    functionName: 'symbol',
    query: {
      enabled: isConfigured.dividend && !isNativeDividend && Boolean(dividendRewardToken.data)
    }
  });

  const dividendTokenDecimals = useReadContract({
    abi: ERC20_ABI,
    address: dividendTokenAddress,
    functionName: 'decimals',
    query: {
      enabled: isConfigured.dividend && !isNativeDividend && Boolean(dividendRewardToken.data)
    }
  });

  const pendingDividendDecimals = isNativeDividend ? 18 : Number(dividendTokenDecimals.data || 18);
  const pendingDividendSymbol = isNativeDividend ? 'BNB' : (dividendTokenSymbol.data || 'TOKEN');

  const tokenMeta = useReadContract({
    abi: ERC20_ABI,
    address: appConfig.tokenAddress,
    functionName: 'symbol',
    query: {
      enabled: isConfigured.token
    }
  });
  const tokenDecimals = useReadContract({
    abi: ERC20_ABI,
    address: appConfig.tokenAddress,
    functionName: 'decimals',
    query: {
      enabled: isConfigured.token
    }
  });

  const walletBalance = useReadContract({
    abi: ERC20_ABI,
    address: appConfig.tokenAddress,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && isConfigured.token, refetchInterval: 10_000 }
  });

  const minerBalance = useReadContract({
    abi: MINER_ABI,
    address: appConfig.minerAddress,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && isConfigured.miner, refetchInterval: 10_000 }
  });

  useEffect(() => {
    let active = true;
    const gateways = [
      process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs',
      'https://ipfs.io/ipfs'
    ];
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function readWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (attempt < retries) {
            await delay(250 * (attempt + 1));
          }
        }
      }
      throw lastError;
    }

    async function fetchJsonWithFallback(urls: string[]): Promise<Record<string, unknown>> {
      let lastError: unknown;
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) {
            lastError = new Error(`metadata request failed: ${response.status}`);
            continue;
          }
          return (await response.json()) as Record<string, unknown>;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError instanceof Error ? lastError : new Error('metadata load failed');
    }

    async function pickReachableUrl(urls: string[]): Promise<string> {
      for (const url of urls) {
        try {
          const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          if (res.ok || res.status === 405) {
            return url;
          }
        } catch {
          continue;
        }
      }
      return urls[0];
    }

    async function loadMetadata() {
      if (!publicClient || !isConfigured.miner || tokenIds.length === 0) {
        if (active) setMetadataByTokenId({});
        return;
      }

      const entries = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const key = tokenId.toString();
          const fallback = getFallbackMetadata(key);

          try {
            const rawTokenUri = (await readWithRetry(() =>
              publicClient.readContract({
                abi: MINER_ABI,
                address: appConfig.minerAddress,
                functionName: 'tokenURI',
                args: [tokenId]
              })
            )) as string;

            const tokenUri = normalizeIpfsUri(rawTokenUri);
            const metadata = await fetchJsonWithFallback(metadataUrls(tokenUri, gateways, key));

            const name = typeof metadata.name === 'string' && metadata.name.trim() ? metadata.name : fallback.name;
            const imageRaw = typeof metadata.image === 'string' && metadata.image.trim() ? metadata.image : fallback.imageUrl;
            const imageUrl = await pickReachableUrl(imageUrls(imageRaw, gateways));

            return [key, { ...fallback, name, imageUrl }] as const;
          } catch {
            return [key, fallback] as const;
          }
        })
      );

      if (active) {
        setMetadataByTokenId(Object.fromEntries(entries));
      }
    }

    void loadMetadata();

    return () => {
      active = false;
    };
  }, [publicClient, tokenIds]);

  return (
    <div className="space-y-12">
      {/* Dashboard Header */}
      <section className="border border-white/10 bg-black/50 backdrop-blur-md p-6 md:p-8 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-neon-green" />
          <h1 className="font-display text-3xl text-white tracking-wider">COMMAND CENTER</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Stat Card 1 */}
          <div className="bg-surface border border-white/5 p-4 group hover:border-flap/50 transition-colors">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Active Agents</div>
            <div className="font-mono text-2xl text-white group-hover:text-flap-glow transition-colors">
              {minerBalance.data?.toString() ?? '0'}
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-surface border border-white/5 p-4 group hover:border-neon-green/50 transition-colors">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Wallet Balance</div>
            <div className="font-mono text-2xl text-white group-hover:text-neon-green transition-colors">
              {walletBalance.data !== undefined && tokenDecimals.data !== undefined
                ? Number(formatUnits(walletBalance.data, tokenDecimals.data)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : '0.00'}
              <span className="text-xs ml-2 text-gray-600">{tokenMeta.data || 'TOKEN'}</span>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-surface border border-white/5 p-4 relative overflow-hidden group hover:border-flap/50 transition-colors">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Pending Dividends</div>
            <div className="font-mono text-2xl text-flap-glow">
              {pendingDividend !== undefined
                ? Number(formatUnits(pendingDividend, pendingDividendDecimals)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : '0.00'}
              <span className="text-xs ml-2 text-gray-600">{pendingDividendSymbol}</span>
            </div>
            
            {/* Claim Button */}
            <button
              type="button"
              onClick={async () => {
                setClaimError('');
                try {
                  await claimDividend();
                } catch (error) {
                  setClaimError(error instanceof Error ? error.message : 'claim failed');
                }
              }}
              disabled={isPending || !pendingDividend || pendingDividend === 0n}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-flap/10 border border-flap text-flap-glow text-xs font-mono uppercase hover:bg-flap hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'SYNCING...' : 'CLAIM'}
            </button>
          </div>
        </div>
        
        {claimError ? (
          <div className="mt-4 p-2 bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-mono">
            ERROR: {claimError}
          </div>
        ) : null}

        {ownedNfaError ? (
          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-xs font-mono">
            WARNING: NFA sync unstable ({ownedNfaError})
          </div>
        ) : null}
      </section>

      {/* NFA Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-sm text-gray-500 uppercase tracking-widest">
            Deployed Units ({tokenIds.length})
          </h2>
          <div className="h-px flex-1 bg-white/10 ml-4" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <div className="col-span-full py-12 text-center font-mono text-gray-500 animate-pulse">
              &gt; SCANNING NETWORK FOR SIGNALS...
            </div>
          ) : null}
          
          {!loading && tokenIds.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-dashed border-white/10">
              <p className="font-mono text-gray-500 mb-4">NO AGENTS DETECTED</p>
              <a href="/" className="inline-block px-6 py-2 bg-neon-green/10 text-neon-green border border-neon-green font-mono text-xs hover:bg-neon-green hover:text-black transition-all">
                INITIATE MINING SEQUENCE
              </a>
            </div>
          ) : null}

          {tokenIds.map((tokenId) => {
            const key = tokenId.toString();
            const meta = metadataByTokenId[key] || getFallbackMetadata(key);
            return (
              <NFACard
                key={key}
                id={key.padStart(4, '0')}
                imageUrl={meta.imageUrl}
                name={meta.name}
                color={meta.color}
                status="mining"
                actionHref={`/chat?tokenId=${tokenId.toString()}`}
                actionLabel="ENTER LINK"
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
