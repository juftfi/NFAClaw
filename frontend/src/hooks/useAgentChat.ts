'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import { appConfig } from '@/lib/config';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  reply: string;
  model: string;
  fallback: boolean;
  toolResults?: Record<string, unknown>;
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function randomNonceHex(byteLength = 16): `0x${string}` {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

function buildChatAuthMessage(params: {
  walletAddress: `0x${string}`;
  tokenId: number;
  chainId: number;
  contractAddress: `0x${string}`;
  issuedAtMs: number;
  expiryMs: number;
  nonce: `0x${string}`;
}): string {
  return [
    'NFAClaw Chat Auth',
    `wallet:${params.walletAddress}`,
    `tokenId:${params.tokenId}`,
    `chainId:${params.chainId}`,
    `contract:${params.contractAddress}`,
    `nonce:${params.nonce}`,
    `issuedAtMs:${params.issuedAtMs}`,
    `expiryMs:${params.expiryMs}`
  ].join('\n');
}

export function useAgentChat() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);

  const sendMessage = async (params: {
    tokenId: number;
    message: string;
    history: ChatMessage[];
  }): Promise<ChatResult> => {
    if (!address) {
      throw new Error('wallet not connected');
    }

    setLoading(true);
    try {
      const issuedAtMs = Date.now();
      const expiryMs = issuedAtMs + 2 * 60 * 1000; // 2 minutes
      const nonce = randomNonceHex(16);
      const authMessage = buildChatAuthMessage({
        walletAddress: address,
        tokenId: params.tokenId,
        chainId: appConfig.chainId,
        contractAddress: appConfig.minerAddress,
        issuedAtMs,
        expiryMs,
        nonce
      });
      const signature = await signMessageAsync({
        message: authMessage
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenId: params.tokenId,
          walletAddress: address,
          message: params.message,
          signature,
          authMessage,
          history: params.history
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'chat request failed');
      }

      return (await response.json()) as ChatResult;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    sendMessage
  };
}
