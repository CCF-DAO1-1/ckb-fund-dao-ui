import React from 'react';
import Image from 'next/image';
import { getAvatarByDid, getDefaultAvatar } from '@/utils/avatarUtils';
import './Avatar.css';

interface AvatarProps {
  size?: number;
  className?: string;
  alt?: string;
  did?: string;
}

export default function Avatar({
  size = 24,
  className = '',
  alt = 'User Avatar',
  did
}: AvatarProps) {
  // 如果有 did 就用 getAvatarByDid，否则用默认头像
  const avatarSrc = did ? getAvatarByDid(did) : getDefaultAvatar();

  return (
    <div className={`avatar-container ${className}`} style={{ width: size, height: size }}>
      <Image
        src={avatarSrc}
        alt={alt}
        width={size}
        height={size}
        className="avatar-image"
      />
    </div>
  );
}
