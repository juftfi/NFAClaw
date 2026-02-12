import { Router } from 'express';
import { z } from 'zod';

import { verifyWalletSignature } from '../services/auth';
import { assertTokenOwnership, getAgentIdentity, getNfaBalance } from '../services/chain';
import { buildPersona } from '../services/persona';
import { generateReply } from '../services/llm';
import { checkBalance } from '../tools/checkBalance';
import { checkDividend } from '../tools/checkDividend';
import { prepareClaim } from '../tools/prepareClaim';

const bodySchema = z.object({
  tokenId: z.number().int().positive(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(1).max(2000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  authMessage: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1)
      })
    )
    .max(10)
    .optional()
});

function intentFlags(message: string) {
  const text = message.toLowerCase();
  return {
    wantsBalance: /余额|balance|token/.test(text),
    wantsDividend: /分红|dividend|收益/.test(text),
    wantsClaim: /claim|领取|提取/.test(text)
  };
}

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid request', detail: parsed.error.flatten() });
  }

  const payload = parsed.data;

  try {
    const signatureValid = await verifyWalletSignature({
      walletAddress: payload.walletAddress as `0x${string}`,
      message: payload.authMessage,
      signature: payload.signature as `0x${string}`
    });

    if (!signatureValid) {
      return res.status(401).json({ error: 'invalid signature' });
    }

    const ownsToken = await assertTokenOwnership(payload.tokenId, payload.walletAddress as `0x${string}`);
    if (!ownsToken) {
      return res.status(403).json({ error: 'wallet does not own this NFA' });
    }

    const [identity, nfaBalance] = await Promise.all([
      getAgentIdentity(payload.tokenId),
      getNfaBalance(payload.walletAddress as `0x${string}`)
    ]);

    const persona = buildPersona(identity.roleId, identity.traitSeed);
    const intents = intentFlags(payload.message);

    const toolResults: Record<string, unknown> = {
      nfaBalance: nfaBalance.toString()
    };

    if (intents.wantsBalance) {
      toolResults.balance = await checkBalance(payload.walletAddress as `0x${string}`);
    }

    if (intents.wantsDividend || intents.wantsClaim) {
      toolResults.dividend = await checkDividend(payload.walletAddress as `0x${string}`);
    }

    if (intents.wantsClaim) {
      toolResults.claimTx = prepareClaim();
    }

    const dataContext = JSON.stringify(
      {
        role: persona.role,
        trait: persona.traitSet,
        chainData: toolResults
      },
      null,
      2
    );

    const llm = await generateReply({
      systemPrompt: persona.systemPrompt,
      history: payload.history || [],
      userMessage: payload.message,
      dataContext
    });

    return res.json({
      reply: llm.content,
      model: llm.model,
      fallback: llm.fallback,
      toolResults
    });
  } catch (error) {
    return res.status(500).json({
      error: 'chat failed',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});
