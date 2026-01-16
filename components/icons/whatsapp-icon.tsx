"use client";

import { useRef } from 'react';
import { useTheme } from 'next-themes';
import { Player } from '@lordicon/react';
import ICON from './inbox.json';

interface WhatsAppIconProps {
  size?: number;
  trigger?: 'hover' | 'click' | 'loop' | 'loop-on-hover';
}

export function WhatsAppIcon({ size = 32, trigger = 'loop' }: WhatsAppIconProps) {
  const playerRef = useRef<Player>(null);
  const { theme } = useTheme();

  const handleTrigger = () => {
    if (trigger === 'hover' || trigger === 'click') {
      playerRef.current?.playFromBeginning();
    }
  };

  return (
    <div
      onMouseEnter={trigger === 'hover' || trigger === 'loop-on-hover' ? handleTrigger : undefined}
      onClick={trigger === 'click' ? handleTrigger : undefined}
      className="inline-flex items-center justify-center"
    >
      <Player
        ref={playerRef}
        icon={ICON}
        size={size}
        colorize={theme === 'dark' ? '#ffffff' : undefined}
        onComplete={() => {
          if (trigger === 'loop' || trigger === 'loop-on-hover') {
            playerRef.current?.playFromBeginning();
          }
        }}
      />
    </div>
  );
}
