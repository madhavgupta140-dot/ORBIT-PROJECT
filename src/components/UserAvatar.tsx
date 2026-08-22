import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  name: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-28 h-28 sm:w-32 sm:h-32 text-3xl font-bold',
  custom: '',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  className = '',
  size = 'md',
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const validSrc = src && typeof src === 'string' && src.trim() !== '' ? src.trim() : null;
  const hasValidImage = Boolean(validSrc && !imageError);

  if (hasValidImage && validSrc) {
    return (
      <img
        src={validSrc}
        alt={name || 'User'}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-stone-800 to-[#181818] border border-stone-700/80 text-stone-300 font-semibold flex items-center justify-center select-none shrink-0 shadow-inner ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {name ? (
        <span>{getInitials(name)}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-stone-400" />
      )}
    </div>
  );
};
