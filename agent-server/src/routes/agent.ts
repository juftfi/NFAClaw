import { Router } from 'express';
import { getAgentIdentity, getTokenOwner } from '../services/chain';
import { buildPersona } from '../services/persona';

export const agentRouter = Router();

agentRouter.get('/:tokenId', async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  if (!Number.isInteger(tokenId) || tokenId <= 0) {
    return res.status(400).json({ error: 'invalid tokenId' });
  }

  try {
    const [identity, owner] = await Promise.all([
      getAgentIdentity(tokenId),
      getTokenOwner(tokenId)
    ]);

    const persona = buildPersona(identity.roleId, identity.traitSeed);

    return res.json({
      tokenId,
      owner,
      identity,
      persona: {
        role: persona.role,
        traits: persona.traitSet
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'failed to query agent',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});
