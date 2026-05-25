/**
 * Trọng số đánh giá thế cờ (BOT.md mục 2.1).
 * Tách ra để dễ tinh chỉnh.
 */
export interface EvalWeights {
  material: number;
  mobility: number;
  center: number;
  threat: number;
  vulnerability: number;
  trappedOpp: number;
  edge: number;
  win: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  material: 100,
  mobility: 2,
  center: 10,
  threat: 50,
  vulnerability: 40,
  trappedOpp: 30,
  edge: 5,
  win: 100000,
};
