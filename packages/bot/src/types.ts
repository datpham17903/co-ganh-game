export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotConfig {
  difficulty: BotDifficulty;
  randomness?: number;
  maxThinkMs?: number;
  seed?: number;
}
