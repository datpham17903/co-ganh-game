import { describe, it, expect } from 'vitest';
import type { BotConfig } from '../src/types.js';

describe('bot package', () => {
  it('placeholder test passes', () => {
    const config: BotConfig = { difficulty: 'easy' };
    expect(config.difficulty).toBe('easy');
  });
});
