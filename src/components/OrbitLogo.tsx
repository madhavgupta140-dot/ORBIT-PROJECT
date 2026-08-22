import React from 'react';

export interface OrbitLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  responsiveWordmark?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
}

export const OrbitLogo: React.FC<OrbitLogoProps> = ({
  size = 'md',
  showWordmark = true,
  responsiveWordmark = false,
  className = '',
  iconClassName = '',
  wordmarkClassName = '',
}) => {
  const iconDimensions = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16',
  };

  const wordmarkSizes = {
    sm: 'text-sm tracking-[0.25em]',
    md: 'text-lg tracking-[0.25em]',
    lg: 'text-2xl tracking-[0.25em]',
    xl: 'text-4xl tracking-[0.25em]',
  };

  const gapSizes = {
    sm: 'gap-2.5',
    md: 'gap-3',
    lg: 'gap-3.5',
    xl: 'gap-4',
  };

  return (
    <div className={`flex items-center ${gapSizes[size]} select-none ${className}`}>
      {/* Orbital Icon Mark */}
      <svg
        viewBox="0 0 32 32"
        className={`${iconDimensions[size]} shrink-0 text-white transition-transform duration-200 group-hover:scale-105 ${iconClassName}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer Orbit Path */}
        <circle
          cx="16"
          cy="16"
          r="13"
          className="stroke-stone-700/80 group-hover:stroke-stone-500 transition-colors"
          strokeWidth="1.5"
        />
        
        {/* Inner Core Node */}
        <circle
          cx="16"
          cy="16"
          r="2.5"
          className="fill-stone-300 group-hover:fill-white transition-colors"
        />
        
        {/* Orbiting Satellite Node with Luminous Glow */}
        <circle
          cx="25.2"
          cy="6.8"
          r="2.2"
          className="fill-white"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.9))',
          }}
        />
      </svg>

      {/* Standardized Editorial Wordmark */}
      {showWordmark && (
        <span
          className={`font-serif italic font-medium text-white transition-colors group-hover:text-stone-100 ${wordmarkSizes[size]} ${
            responsiveWordmark ? 'hidden lg:inline-block' : 'inline-block'
          } ${wordmarkClassName}`}
        >
          ORBIT
        </span>
      )}
    </div>
  );
};

