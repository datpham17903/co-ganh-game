import { useEffect } from 'react';
import { audio } from '../../lib/audio.js';
import { useGameStore } from '../../stores/gameStore.js';

/**
 * Lắng nghe state.moveHistory + capturedHistory để play sound.
 */
export function useGameSound(): void {
  const moveCount = useGameStore((s) => s.state.moveHistory.length);
  const captureCount = useGameStore((s) => s.state.capturedHistory.length);
  const status = useGameStore((s) => s.state.status);

  useEffect(() => {
    if (moveCount === 0) return;
    audio.play('move');
  }, [moveCount]);

  useEffect(() => {
    if (captureCount === 0) return;
    audio.play('capture');
  }, [captureCount]);

  useEffect(() => {
    if (status === 'B_won' || status === 'W_won') audio.play('win');
    else if (status === 'draw') audio.play('draw');
  }, [status]);
}
