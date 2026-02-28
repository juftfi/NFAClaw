'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';

import { MINER_ABI } from '@/lib/contracts';
import { appConfig, isConfigured } from '@/lib/config';

export function useOwnedNfas() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function readWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          return await fn();
        } catch (err) {
          lastError = err;
          if (attempt < retries) {
            await delay(250 * (attempt + 1));
          }
        }
      }
      throw lastError;
    }

    async function run() {
      if (!address || !publicClient || !isConfigured.miner) {
        setTokenIds([]);
        setError('');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const count = (await readWithRetry(() =>
          publicClient.readContract({
            abi: MINER_ABI,
            address: appConfig.minerAddress,
            functionName: 'balanceOf',
            args: [address]
          })
        )) as bigint;

        const indexes = Array.from({ length: Number(count) }, (_, index) => BigInt(index));
        const list = (await Promise.all(
          indexes.map((index) =>
            readWithRetry(() =>
              publicClient.readContract({
                abi: MINER_ABI,
                address: appConfig.minerAddress,
                functionName: 'tokenOfOwnerByIndex',
                args: [address, index]
              })
            )
          )
        )) as bigint[];

        if (active) {
          setTokenIds(list);
        }
      } catch (err) {
        if (active) {
          setTokenIds([]);
          setError(err instanceof Error ? err.message : 'failed to load owned NFAs');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [address, publicClient]);

  return {
    tokenIds,
    loading,
    error
  };
}
