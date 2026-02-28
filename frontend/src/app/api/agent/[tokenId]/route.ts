import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAgentIdentity, getTokenOwner } from '@/lib/agent/chain';
import { buildPersona } from '@/lib/agent/persona';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = Number(params.tokenId);
  if (!Number.isInteger(tokenId) || tokenId <= 0) {
    return NextResponse.json({ error: 'invalid tokenId' }, { status: 400 });
  }

  try {
    const [identity, owner] = await Promise.all([getAgentIdentity(tokenId), getTokenOwner(tokenId)]);
    const persona = buildPersona(identity.roleId, identity.traitSeed);
    const traitsHash = createHash('sha256')
      .update(JSON.stringify(persona.nfaProfile.traits))
      .digest('hex');

    return NextResponse.json({
      tokenId,
      owner,
      identity,
      persona: {
        role: persona.role,
        traits: persona.traitSet,
        nfaclawProfile: persona.nfaProfile
      },
      rarity: persona.nfaProfile.rarity,
      validation: {
        traitSeed: identity.traitSeed,
        traitsHash
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'failed to query agent',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
