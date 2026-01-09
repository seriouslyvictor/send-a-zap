"use client";

import { useRef } from 'react';
import { useTheme } from 'next-themes';
import { Player } from '@lordicon/react';
import ICON from './cross.json';

interface CrossIconProps {
  size?: number;
  trigger?: 'hover' | 'click' | 'loop';
}

export function CrossIcon({ size = 24, trigger = 'hover' }: CrossIconProps) {
  const playerRef = useRef<Player>(null);
  const { theme } = useTheme();

  const handleTrigger = () => {
    if (trigger === 'hover' || trigger === 'click') {
      playerRef.current?.playFromBeginning();
    }
  };

  return (
    <div
      onMouseEnter={trigger === 'hover' ? handleTrigger : undefined}
      onClick={trigger === 'click' ? handleTrigger : undefined}
      className="inline-flex items-center justify-center"
    >
      <Player
        ref={playerRef}
        icon={ICON}
        size={size}
        colorize={theme === 'dark' ? '#ffffff' : undefined}
        onComplete={() => playerRef.current?.goToFirstFrame()}
      />
    </div>
  );
}
