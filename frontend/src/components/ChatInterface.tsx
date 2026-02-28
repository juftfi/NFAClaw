'use client';

import { useEffect, useState } from 'react';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useOwnedNfas } from '@/hooks/useOwnedNfas';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  initialTokenId?: string;
}

export function ChatInterface({ initialTokenId }: ChatInterfaceProps) {
  const [tokenId, setTokenId] = useState(initialTokenId || '1');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState('');
  const { tokenIds, loading: loadingOwnedNfas } = useOwnedNfas();

  const { loading, sendMessage } = useAgentChat();

  useEffect(() => {
    if (initialTokenId) {
      setTokenId(initialTokenId);
    }
  }, [initialTokenId]);

  useEffect(() => {
    if (initialTokenId || loadingOwnedNfas || tokenIds.length === 0) return;
    const current = Number(tokenId);
    const ownsCurrent = Number.isInteger(current) && tokenIds.some((id) => id === BigInt(current));
    if (!ownsCurrent) {
      setTokenId(tokenIds[0].toString());
    }
  }, [initialTokenId, loadingOwnedNfas, tokenId, tokenIds]);

  const onSend = async () => {
    setError('');
    const text = input.trim();
    if (!text) return;

    const numericTokenId = Number(tokenId);
    if (!Number.isInteger(numericTokenId) || numericTokenId <= 0) {
      setError('INVALID IDENTITY TOKEN');
      return;
    }
    if (tokenIds.length > 0 && !tokenIds.some((id) => id === BigInt(numericTokenId))) {
      setError('THIS TOKEN IS NOT IN CONNECTED WALLET');
      return;
    }

    const nextMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextMessages);
    setInput('');

    try {
      const result = await sendMessage({
        tokenId: numericTokenId,
        message: text,
        history: nextMessages.slice(-8)
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TRANSMISSION FAILED');
    }
  };

  return (
    <section className="border border-white/10 bg-black/50 backdrop-blur-md relative overflow-hidden h-[600px] flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
          <h2 className="font-mono text-sm text-neon-green tracking-widest uppercase">Secure Uplink</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500">IDENTITY:</span>
          <input
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="w-16 bg-black border border-white/20 text-white font-mono text-xs px-2 py-1 focus:border-neon-green outline-none text-center"
            placeholder="ID"
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
            <p>&gt; INITIALIZING COMMS...</p>
            <p>&gt; WAITING FOR INPUT...</p>
          </div>
        ) : null}

        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 border ${
                msg.role === 'user'
                  ? 'border-neon-green/30 bg-neon-green/5 text-neon-green'
                  : 'border-flap/30 bg-flap/5 text-flap-glow'
              }`}
            >
              <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">
                {msg.role === 'user' ? 'OPERATOR' : `UNIT-${tokenId.padStart(4, '0')}`}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="p-3 border border-flap/30 bg-flap/5 text-flap-glow animate-pulse">
              &gt; PROCESSING...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-black/40">
        {!loadingOwnedNfas && tokenIds.length > 0 ? (
          <p className="mb-2 text-[10px] text-gray-500 font-mono">
            OWNED NFA IDs: {tokenIds.map((id) => id.toString()).join(', ')}
          </p>
        ) : null}
        <div className="flex gap-0">
          <div className="bg-white/5 border border-white/10 px-3 py-3 flex items-center">
            <span className="text-neon-green font-mono">&gt;</span>
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void onSend();
              }
            }}
            className="flex-1 bg-black border-y border-r border-white/10 px-4 py-3 text-white font-mono text-sm outline-none focus:border-neon-green/50 transition-colors placeholder-gray-700"
            placeholder="Enter command..."
            autoFocus
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={loading}
            className="bg-neon-green/10 border border-neon-green text-neon-green px-6 font-mono text-xs uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-500 font-mono">! {error}</p> : null}
      </div>
    </section>
  );
}
