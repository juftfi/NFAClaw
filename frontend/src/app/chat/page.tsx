'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';

function ChatPageContent() {
  const params = useSearchParams();
  const tokenId = params.get('tokenId') ?? undefined;

  return (
    <div className="space-y-8">
      <section className="border-l-2 border-neon-green pl-6 py-2">
        <h1 className="font-display text-4xl text-white tracking-wider mb-2">NEURAL LINK</h1>
        <p className="font-mono text-sm text-gray-400 max-w-2xl">
          Establish a direct neural link with your NFAClaw unit. Verify identity, check dividend status, or execute chain commands.
        </p>
      </section>

      <ChatInterface initialTokenId={tokenId} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="font-mono text-xs text-gray-500">LOADING...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
