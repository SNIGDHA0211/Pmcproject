import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';

export function isUsableAvatarUrl(src?: string | null): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  return Boolean(trimmed && trimmed !== 'null' && trimmed !== 'undefined');
}

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  iconSize?: number;
  isDarkTheme?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  className = 'h-9 w-9 rounded-lg',
  iconSize = 18,
  isDarkTheme = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = isUsableAvatarUrl(src) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (showImage) {
    return (
      <img
        src={src!.trim()}
        alt={name}
        className={`${className} shrink-0 object-cover transition-transform duration-200 group-hover:scale-105`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
        isDarkTheme
          ? 'bg-indigo-500/15 text-indigo-300'
          : 'bg-indigo-50 text-indigo-600'
      }`}
      aria-label={name}
      role="img"
    >
      <Icons.User size={iconSize} strokeWidth={2} />
    </div>
  );
};

export default UserAvatar;
