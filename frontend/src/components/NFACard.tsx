import Image from 'next/image';
import Link from 'next/link';

interface NFACardProps {
  id: string;
  imageUrl: string;
  name: string;
  status?: 'minted' | 'mining' | 'locked';
  color?: 'green' | 'purple' | 'blue';
  actionHref?: string;
  actionLabel?: string;
}

export function NFACard({
  id,
  imageUrl,
  name,
  status = 'minted',
  color = 'green',
  actionHref,
  actionLabel,
}: NFACardProps) {
  const borderColor = color === 'purple' ? 'border-flap' : 'border-neon-green';
  const glowColor = color === 'purple' ? 'group-hover:shadow-neon-purple' : 'group-hover:shadow-neon-green';
  const textColor = color === 'purple' ? 'text-flap-glow' : 'text-neon-green';

  return (
    <div className={`group relative aspect-square bg-surface border ${borderColor} transition-all duration-300 ${glowColor}`}>
      {/* Image Container */}
      <div className="relative w-full h-full overflow-hidden">
        <Image 
          src={imageUrl} 
          alt={name}
          fill
          className="object-cover pixelated rendering-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
        
        {/* ID Badge */}
        <div className="absolute top-2 right-2">
          <span className="font-mono text-[10px] bg-black/80 px-1 py-0.5 text-gray-400">
            #{id}
          </span>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10 bg-black/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <span className={`font-mono text-xs uppercase tracking-wider ${textColor}`}>
              {name}
            </span>
            <div className={`w-2 h-2 ${color === 'purple' ? 'bg-flap' : 'bg-neon-green'} animate-pulse`} />
          </div>
          {actionHref && actionLabel ? (
            <div className="mt-2">
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center px-3 py-1 text-[10px] font-mono uppercase tracking-widest border border-neon-green/60 text-neon-green hover:bg-neon-green hover:text-black transition-all"
              >
                {actionLabel}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
