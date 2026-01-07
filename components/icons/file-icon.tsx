"use client";

import { useRef } from 'react';
import { Player } from '@lordicon/react';
import ICON from './file.json';

interface FileIconProps {
  size?: number;
  trigger?: 'hover' | 'click' | 'loop';
}

export function FileIcon({ size = 24, trigger = 'hover' }: FileIconProps) {
  const playerRef = useRef<Player>(null);

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
        onComplete={() => playerRef.current?.goToFirstFrame()}
      />
    </div>
  );
}
