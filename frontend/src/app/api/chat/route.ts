import { NextResponse } from 'next/server';
import { assertTokenOwnership, getAgentIdentity, getNfaBalance } from '@/lib/agent/chain';
import { verifyWalletSignature } from '@/lib/agent/auth';
import { getServerConfig } from '@/lib/agent/config';
import { buildPersona } from '@/lib/agent/persona';
import { generateReply } from '@/lib/agent/llm';
import { checkBalance } from '@/lib/agent/tools/checkBalance';
import { checkDividend } from '@/lib/agent/tools/checkDividend';
import { prepareClaim } from '@/lib/agent/tools/prepareClaim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RATE_LIMIT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX || 80);
const RATE_LIMIT_WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 24 * 60 * 60 * 1000);
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

interface ChatBody {
  tokenId: number;
  walletAddress: `0x${string}`;
  message: string;
  signature: `0x${string}`;
  authMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

type ChatAuthFields = {
  wallet: `0x${string}`;
  tokenId: number;
  chainId: number;
  contract: `0x${string}`;
  nonce: `0x${string}`;
  issuedAtMs: number;
  expiryMs: number;
};

function isHexAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isHexNonce(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{16,128}$/.test(value);
}

function isHexSignature(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]+$/.test(value);
}

function parseChatAuthMessage(message: string): { ok: true; data: ChatAuthFields } | { ok: false; error: string } {
  const lines = message.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, error: 'authMessage too short' };
  }
  if (lines[0] !== 'NFAClaw Chat Auth') {
    return { ok: false, error: 'unsupported authMessage format' };
  }

  const map = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k && v) map.set(k, v);
  }

  const wallet = map.get('wallet');
  const tokenIdRaw = map.get('tokenId');
  const chainIdRaw = map.get('chainId');
  const contract = map.get('contract');
  const nonce = map.get('nonce');
  const issuedAtMsRaw = map.get('issuedAtMs');
  const expiryMsRaw = map.get('expiryMs');

  if (!isHexAddress(wallet)) return { ok: false, error: 'invalid auth wallet' };
  if (!isHexAddress(contract)) return { ok: false, error: 'invalid auth contract' };
  if (!isHexNonce(nonce)) return { ok: false, error: 'invalid auth nonce' };

  const tokenId = Number(tokenIdRaw);
  const chainId = Number(chainIdRaw);
  const issuedAtMs = Number(issuedAtMsRaw);
  const expiryMs = Number(expiryMsRaw);
  if (!Number.isInteger(tokenId) || tokenId <= 0) return { ok: false, error: 'invalid auth tokenId' };
  if (!Number.isInteger(chainId) || chainId <= 0) return { ok: false, error: 'invalid auth chainId' };
  if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) return { ok: false, error: 'invalid auth issuedAtMs' };
  if (!Number.isFinite(expiryMs) || expiryMs <= 0) return { ok: false, error: 'invalid auth expiryMs' };

  return {
    ok: true,
    data: {
      wallet,
      tokenId,
      chainId,
      contract,
      nonce,
      issuedAtMs,
      expiryMs
    }
  };
}

function parseChatBody(value: unknown): { ok: true; data: ChatBody } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'body must be an object' };
  }

  const body = value as Record<string, unknown>;
  const tokenId = body.tokenId;
  const walletAddress = body.walletAddress;
  const message = body.message;
  const signature = body.signature;
  const authMessage = body.authMessage;
  const history = body.history;

  if (!Number.isInteger(tokenId) || Number(tokenId) <= 0) {
    return { ok: false, error: 'invalid tokenId' };
  }
  if (!isHexAddress(walletAddress)) {
    return { ok: false, error: 'invalid walletAddress' };
  }
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
    return { ok: false, error: 'invalid message' };
  }
  if (!isHexSignature(signature)) {
    return { ok: false, error: 'invalid signature' };
  }
  if (typeof authMessage !== 'string' || authMessage.trim().length === 0) {
    return { ok: false, error: 'invalid authMessage' };
  }

  const parsedHistory: ChatBody['history'] = [];
  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > 10) {
      return { ok: false, error: 'invalid history' };
    }

    for (const item of history) {
      if (!item || typeof item !== 'object') {
        return { ok: false, error: 'invalid history item' };
      }

      const role = (item as Record<string, unknown>).role;
      const content = (item as Record<string, unknown>).content;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.length === 0) {
        return { ok: false, error: 'invalid history item' };
      }

      parsedHistory.push({ role, content });
    }
  }

  return {
    ok: true,
    data: {
      tokenId: Number(tokenId),
      walletAddress,
      message,
      signature,
      authMessage,
      history: parsedHistory
    }
  };
}

function intentFlags(message: string) {
  const text = message.toLowerCase();
  return {
    wantsBalance: /余额|balance|token/.test(text),
    wantsDividend: /分红|dividend|收益/.test(text),
    wantsClaim: /claim|领取|提取/.test(text)
  };
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) {
    return 'unknown';
  }
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

function enforceRateLimit(key: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    requestBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return { allowed: true };
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);
  return { allowed: true };
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = enforceRateLimit(`chat:${clientIp}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSec)
        }
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }

  const parsed = parseChatBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'invalid request', detail: parsed.error }, { status: 400 });
  }

  const payload = parsed.data;

  const walletScoped = enforceRateLimit(`chat:${payload.walletAddress}:${payload.tokenId}`);
  if (!walletScoped.allowed) {
    return NextResponse.json(
      { error: 'rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': String(walletScoped.retryAfterSec)
        }
      }
    );
  }

  try {
    const config = getServerConfig();
    const authParsed = parseChatAuthMessage(payload.authMessage);
    if (!authParsed.ok) {
      return NextResponse.json({ error: 'invalid authMessage', detail: authParsed.error }, { status: 400 });
    }
    const auth = authParsed.data;

    if (auth.wallet.toLowerCase() !== payload.walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'auth wallet mismatch' }, { status: 401 });
    }
    if (auth.tokenId !== payload.tokenId) {
      return NextResponse.json({ error: 'auth tokenId mismatch' }, { status: 401 });
    }
    if (auth.chainId !== config.chainId) {
      return NextResponse.json({ error: 'auth chainId mismatch' }, { status: 401 });
    }
    if (auth.contract.toLowerCase() !== config.minerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'auth contract mismatch' }, { status: 401 });
    }

    const now = Date.now();
    const maxTtlMs = 10 * 60 * 1000;
    if (auth.expiryMs < now) {
      return NextResponse.json({ error: 'auth expired' }, { status: 401 });
    }
    if (auth.expiryMs - auth.issuedAtMs > maxTtlMs) {
      return NextResponse.json({ error: 'auth ttl too long' }, { status: 400 });
    }

    const [signatureValid, ownsToken] = await Promise.all([
      verifyWalletSignature({
        walletAddress: payload.walletAddress,
        message: payload.authMessage,
        signature: payload.signature
      }),
      assertTokenOwnership(payload.tokenId, payload.walletAddress)
    ]);

    if (!signatureValid) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    if (!ownsToken) {
      return NextResponse.json({ error: 'wallet does not own this NFA' }, { status: 403 });
    }

    const [identity, nfaBalance] = await Promise.all([
      getAgentIdentity(payload.tokenId),
      getNfaBalance(payload.walletAddress)
    ]);

    const persona = buildPersona(identity.roleId, identity.traitSeed);
    const intents = intentFlags(payload.message);

    const toolResults: Record<string, unknown> = {
      nfaBalance: nfaBalance.toString()
    };

    const toolCalls: Promise<void>[] = [];

    if (intents.wantsBalance) {
      toolCalls.push(
        checkBalance(payload.walletAddress).then((result) => {
          toolResults.balance = result;
        })
      );
    }

    if (intents.wantsDividend || intents.wantsClaim) {
      toolCalls.push(
        checkDividend(payload.walletAddress).then((result) => {
          toolResults.dividend = result;
        })
      );
    }

    await Promise.all(toolCalls);

    if (intents.wantsClaim) {
      toolResults.claimTx = prepareClaim();
    }

    const dataContext = JSON.stringify(
      {
        role: persona.role,
        trait: persona.traitSet,
        nfaclawProfile: persona.nfaProfile,
        chainData: toolResults
      },
      null,
      2
    );

    const llm = await generateReply({
      systemPrompt: persona.systemPrompt,
      history: payload.history,
      userMessage: payload.message,
      dataContext
    });

    return NextResponse.json({
      reply: llm.content,
      model: llm.model,
      fallback: llm.fallback,
      toolResults
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'chat failed',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
