import personaData from './data/personas.json';
import type { PersonaTraitSet } from './types';
import { deriveFlapclawV5Profile } from './nfaclawV5';

interface RoleTemplate {
  id: number;
  name: string;
  style: string;
  expertise: string;
}

function deriveTrait(seed: bigint, size: number, shift: bigint): number {
  return Number((seed >> shift) % BigInt(size));
}

export function buildPersona(roleId: number, traitSeedHex: `0x${string}`) {
  const roles = personaData.roles as RoleTemplate[];
  const role = roles.find((item) => item.id === roleId) ?? roles[0];
  const seed = BigInt(traitSeedHex);

  const traitsPool = personaData.traits;
  const traitSet: PersonaTraitSet = {
    tone: traitsPool.tones[deriveTrait(seed, traitsPool.tones.length, 0n)],
    verbosity: traitsPool.verbosity[deriveTrait(seed, traitsPool.verbosity.length, 8n)],
    catchphrase: traitsPool.catchphrases[deriveTrait(seed, traitsPool.catchphrases.length, 16n)],
    emojiLevel: traitsPool.emojiLevels[deriveTrait(seed, traitsPool.emojiLevels.length, 24n)]
  };
  const nfaProfile = deriveFlapclawV5Profile(traitSeedHex);

  return {
    role,
    traitSet,
    nfaProfile,
    systemPrompt: [
      `你是一个链上 Agent，角色名: ${role.name}`,
      `角色风格: ${role.style}`,
      `角色专长: ${role.expertise}`,
      `语气: ${traitSet.tone}`,
      `话痨程度: ${traitSet.verbosity}`,
      `口头禅: ${traitSet.catchphrase}`,
      `emoji频率: ${traitSet.emojiLevel}`,
      `FlapFlaw v5 特征: ${JSON.stringify(nfaProfile.traits)}`,
      `FlapFlaw 稀有度: ${nfaProfile.rarity.tier} (score=${nfaProfile.rarity.score}, percentile=${nfaProfile.rarity.percentile}, hint=${nfaProfile.rarity.rankHint})`,
      `稀有特征锚点: ${nfaProfile.rarity.topTraits.map((item) => `${item.layerLabel}:${item.trait}(x${item.rarityFactor})`).join(', ')}`,
      `风格锚点: ${nfaProfile.styleAnchors.join('；') || '保持角色本体风格'}`,
      `行为准则: ${nfaProfile.behaviorDirectives.join('；') || '结论先行，动作可执行'}`,
      `可用口头禅补充: ${nfaProfile.catchphraseHints.join('；') || '无'}`,
      '输出要求: 必须简洁、可执行、尽量引用实时链上数据，不要承诺收益。',
      '如果用户询问 claim 或余额，优先根据工具返回的数据回答，并说明下一步。',
      '说话时要体现“角色本体 + NFAClaw 稀有特征”的混合人格，不要只重复模板话术。'
    ].join('\n')
  };
}
