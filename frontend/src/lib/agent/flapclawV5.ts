type LayerKey =
  | 'background'
  | 'wings'
  | 'wingPattern'
  | 'body'
  | 'clawMaterial'
  | 'accessory'
  | 'special';

interface TraitDef {
  name: string;
  weight: number;
}

interface LayerDef {
  key: LayerKey;
  label: string;
  shift: bigint;
  traits: TraitDef[];
}

export interface SelectedTrait {
  layer: LayerKey;
  layerLabel: string;
  trait: string;
  weight: number;
  totalWeight: number;
  weightShare: number;
  rarityFactor: number;
}

export interface FlapclawRarity {
  score: number;
  percentile: number;
  tier: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  rankHint: string;
  topTraits: SelectedTrait[];
}

export interface FlapclawProfile {
  traits: Record<LayerKey, string>;
  selected: SelectedTrait[];
  rarity: FlapclawRarity;
  styleAnchors: string[];
  behaviorDirectives: string[];
  catchphraseHints: string[];
}

const NFACLAW_V5_LAYERS: LayerDef[] = [
  {
    key: 'background',
    label: 'Background',
    shift: 0n,
    traits: [
      { name: 'Sky Blue', weight: 12 },
      { name: 'Sunset', weight: 10 },
      { name: 'Night', weight: 8 },
      { name: 'Forest', weight: 10 },
      { name: 'Ocean', weight: 8 },
      { name: 'Lilac', weight: 10 },
      { name: 'Peach', weight: 8 },
      { name: 'Mint', weight: 8 }
    ]
  },
  {
    key: 'wings',
    label: 'Wings',
    shift: 16n,
    traits: [
      { name: 'Blue Morpho', weight: 10 },
      { name: 'Monarch', weight: 10 },
      { name: 'Ruby', weight: 6 },
      { name: 'Emerald', weight: 8 },
      { name: 'Violet', weight: 8 },
      { name: 'Golden', weight: 5 },
      { name: 'Sunset Pink', weight: 8 },
      { name: 'Ice Crystal', weight: 6 },
      { name: 'Obsidian', weight: 4 },
      { name: 'Pearl', weight: 5 },
      { name: 'Neon Green', weight: 4 },
      { name: 'Fire', weight: 3 },
      { name: 'Teal', weight: 5 },
      { name: 'Lavender', weight: 8 }
    ]
  },
  {
    key: 'wingPattern',
    label: 'Wing Pattern',
    shift: 32n,
    traits: [
      { name: 'None', weight: 25 },
      { name: 'Eye Spots', weight: 3 },
      { name: 'Stripe Bands', weight: 10 },
      { name: 'Border Glow', weight: 8 },
      { name: 'Vein Lines', weight: 8 },
      { name: 'Dot Scatter', weight: 8 },
      { name: 'Gradient Fade', weight: 6 },
      { name: 'Star Pattern', weight: 5 },
      { name: 'Crescent Marks', weight: 5 },
      { name: 'Diamond Tips', weight: 4 }
    ]
  },
  {
    key: 'body',
    label: 'Body',
    shift: 48n,
    traits: [
      { name: 'Classic Red', weight: 18 },
      { name: 'Coral', weight: 14 },
      { name: 'Blue Lobster', weight: 10 },
      { name: 'Shadow', weight: 8 },
      { name: 'Albino', weight: 4 },
      { name: 'Golden Shell', weight: 3 },
      { name: 'Neon Shell', weight: 2 }
    ]
  },
  {
    key: 'clawMaterial',
    label: 'Claw Material',
    shift: 64n,
    traits: [
      { name: 'None', weight: 70 },
      { name: 'Obsidian Claws', weight: 8 },
      { name: 'Golden Claws', weight: 6 },
      { name: 'Pearl Claws', weight: 6 },
      { name: 'Neon Claws', weight: 4 },
      { name: 'Crimson Claws', weight: 6 }
    ]
  },
  {
    key: 'accessory',
    label: 'Accessory',
    shift: 80n,
    traits: [
      { name: 'None', weight: 65 },
      { name: 'Tiny Crown', weight: 10 },
      { name: 'Tech Halo', weight: 6 },
      { name: 'Horns', weight: 6 },
      { name: 'Cyber Visor', weight: 6 },
      { name: 'Pearl Necklace', weight: 8 }
    ]
  },
  {
    key: 'special',
    label: 'Special',
    shift: 96n,
    traits: [
      { name: 'None', weight: 50 },
      { name: 'Sparkle Trail', weight: 10 },
      { name: 'Rainbow Aura', weight: 8 },
      { name: 'Fire Glow', weight: 5 },
      { name: 'Frost Crystals', weight: 4 },
      { name: 'Cosmic Dust', weight: 3 }
    ]
  }
];

function pickWeightedTrait(seed: bigint, layer: LayerDef): SelectedTrait {
  const totalWeight = layer.traits.reduce((sum, item) => sum + item.weight, 0);
  const roll = Number((seed >> layer.shift) % BigInt(totalWeight));

  let cursor = 0;
  let chosen = layer.traits[0];
  for (const trait of layer.traits) {
    cursor += trait.weight;
    if (roll < cursor) {
      chosen = trait;
      break;
    }
  }

  return {
    layer: layer.key,
    layerLabel: layer.label,
    trait: chosen.name,
    weight: chosen.weight,
    totalWeight,
    weightShare: Number((chosen.weight / totalWeight).toFixed(4)),
    rarityFactor: Number((totalWeight / chosen.weight).toFixed(3))
  };
}

function scoreBounds() {
  let min = 0;
  let max = 0;
  for (const layer of NFACLAW_V5_LAYERS) {
    const total = layer.traits.reduce((sum, item) => sum + item.weight, 0);
    const scores = layer.traits.map((item) => Math.log2(total / item.weight));
    min += Math.min(...scores);
    max += Math.max(...scores);
  }
  return { min, max };
}

const BOUNDS = scoreBounds();

function percentileToTier(percentile: number): FlapclawRarity['tier'] {
  if (percentile >= 97) return 'Mythic';
  if (percentile >= 90) return 'Legendary';
  if (percentile >= 75) return 'Epic';
  if (percentile >= 50) return 'Rare';
  return 'Common';
}

function percentileToRankHint(percentile: number): string {
  if (percentile >= 99) return 'Top 1% 稀有体';
  if (percentile >= 95) return 'Top 5% 稀有体';
  if (percentile >= 90) return 'Top 10% 稀有体';
  if (percentile >= 75) return 'Top 25% 进阶体';
  if (percentile >= 50) return '中位以上';
  return '常见区间';
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function buildStyleAnchors(selected: SelectedTrait[], tier: FlapclawRarity['tier']) {
  const traits = Object.fromEntries(selected.map((item) => [item.layer, item.trait])) as Record<LayerKey, string>;
  const style: string[] = [];
  const behavior: string[] = [];
  const catchphrases: string[] = [];

  if (traits.body === 'Neon Shell') {
    style.push('语气高能、压迫感强、节奏快');
    behavior.push('先给激进方案，再补一行风险提醒');
    catchphrases.push('电流拉满，直接上强度');
  }
  if (traits.body === 'Golden Shell') {
    style.push('王者口吻，强调掌控和秩序');
    behavior.push('优先给框架化方案与优先级');
    catchphrases.push('金壳不赌，金壳只做确定性');
  }
  if (traits.body === 'Shadow' || traits.wings === 'Obsidian') {
    style.push('冷静、偏黑客感、讽刺力度更高');
    behavior.push('先拆漏洞，再给最短执行路径');
    catchphrases.push('暗面看得更清楚');
  }
  if (traits.wings === 'Fire' || traits.special === 'Fire Glow') {
    style.push('攻击性上调，句子短促');
    behavior.push('每次给出一个立即可执行动作');
    catchphrases.push('别等了，点火就飞');
  }
  if (traits.wings === 'Ice Crystal' || traits.special === 'Frost Crystals') {
    style.push('理性分析，情绪克制');
    behavior.push('优先量化指标与边界条件');
    catchphrases.push('先冷却，再决策');
  }
  if (traits.accessory === 'Tiny Crown') {
    style.push('领队语气，默认你在下达作战指令');
    behavior.push('回答末尾附一个明确的下一步命令');
  }
  if (traits.accessory === 'Cyber Visor') {
    style.push('技术流表达，偏系统化');
    behavior.push('优先引用链上数据、合约状态、交易参数');
  }
  if (traits.accessory === 'Tech Halo' || traits.special === 'Cosmic Dust') {
    style.push('带一点神谕感，但不玄学');
    behavior.push('判断后必须落到可执行动作');
  }
  if (traits.wingPattern === 'None') {
    style.push('表达更直接，不堆花哨修辞');
  }
  if (traits.clawMaterial === 'None') {
    behavior.push('冲突语气降低一级，强调稳健执行');
  } else {
    behavior.push('保留锋利感，但禁止空洞挑衅');
  }

  if (tier === 'Mythic') {
    style.push('稀有体姿态：高度自信、低容忍冗余表达');
    behavior.push('默认使用“结论先行 + 两条动作”格式');
  } else if (tier === 'Legendary') {
    style.push('高阶体姿态：强主见、少解释');
    behavior.push('优先提出取舍，不给模糊建议');
  } else if (tier === 'Epic') {
    style.push('进攻与稳健并重');
  } else if (tier === 'Common') {
    behavior.push('减少炫技，优先清晰和可读性');
  }

  return {
    style: unique(style),
    behavior: unique(behavior),
    catchphrases: unique(catchphrases)
  };
}

export function deriveFlapclawV5Profile(traitSeedHex: `0x${string}`): FlapclawProfile {
  const seed = BigInt(traitSeedHex);
  const selected = NFACLAW_V5_LAYERS.map((layer) => pickWeightedTrait(seed, layer));

  const rarityScoreRaw = selected.reduce((sum, item) => sum + Math.log2(item.totalWeight / item.weight), 0);
  const normalized = ((rarityScoreRaw - BOUNDS.min) / (BOUNDS.max - BOUNDS.min)) * 100;
  const percentile = Math.max(1, Math.min(99, Math.round(normalized)));
  const tier = percentileToTier(percentile);

  const topTraits = [...selected]
    .sort((a, b) => b.rarityFactor - a.rarityFactor)
    .slice(0, 3);

  const influences = buildStyleAnchors(selected, tier);
  const traitsRecord = selected.reduce(
    (acc, item) => {
      acc[item.layer] = item.trait;
      return acc;
    },
    {} as Record<LayerKey, string>
  );

  return {
    traits: traitsRecord,
    selected,
    rarity: {
      score: Number(rarityScoreRaw.toFixed(2)),
      percentile,
      tier,
      rankHint: percentileToRankHint(percentile),
      topTraits
    },
    styleAnchors: influences.style,
    behaviorDirectives: influences.behavior,
    catchphraseHints: influences.catchphrases
  };
}
