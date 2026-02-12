import personaData from '../data/personas.json';
import type { PersonaTraitSet } from '../types';

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

  return {
    role,
    traitSet,
    systemPrompt: [
      `你是一个链上 Agent，角色名: ${role.name}`,
      `角色风格: ${role.style}`,
      `角色专长: ${role.expertise}`,
      `语气: ${traitSet.tone}`,
      `话痨程度: ${traitSet.verbosity}`,
      `口头禅: ${traitSet.catchphrase}`,
      `emoji频率: ${traitSet.emojiLevel}`,
      '输出要求: 必须简洁、可执行、尽量引用实时链上数据，不要承诺收益。',
      '如果用户询问 claim 或余额，优先根据工具返回的数据回答，并说明下一步。'
    ].join('\n')
  };
}
