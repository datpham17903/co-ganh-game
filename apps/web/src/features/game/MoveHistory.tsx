import { index2coord, type Move } from '@co-ganh/engine';
import { useGameStore } from '../../stores/gameStore.js';

function fmtCell(idx: number): string {
  const [r, c] = index2coord(idx);
  // a-e chỉ cột, 1-5 chỉ hàng (đảo theo layout cờ thường)
  const col = String.fromCharCode('a'.charCodeAt(0) + c);
  return `${col}${5 - r}`;
}

export function MoveHistory() {
  const moves = useGameStore((s) => s.state.moveHistory);
  const captures = useGameStore((s) => s.state.capturedHistory);

  if (moves.length === 0) {
    return <p className="text-sm text-text-muted">Chưa có nước đi nào.</p>;
  }

  return (
    <ol className="text-sm font-num space-y-1 max-h-48 overflow-auto" aria-label="Lịch sử nước đi">
      {moves.map((m: Move, i) => {
        const captureForMove = captures.filter((c) => c.byMove === i + 1);
        const ganh = captureForMove
          .filter((c) => c.type === 'ganh')
          .reduce((sum, c) => sum + c.positions.length, 0);
        const vay = captureForMove
          .filter((c) => c.type === 'vay')
          .reduce((sum, c) => sum + c.positions.length, 0);
        return (
          <li key={i} className="flex gap-2" data-testid={`move-${i + 1}`}>
            <span className="text-text-muted">{i + 1}.</span>
            <span>{m.color === 'B' ? 'Đen' : 'Trắng'}:</span>
            <span>
              {fmtCell(m.from)}→{fmtCell(m.to)}
            </span>
            {ganh > 0 && <span className="text-accent">(gánh ×{ganh})</span>}
            {vay > 0 && <span className="text-accent-2">(vây ×{vay})</span>}
          </li>
        );
      })}
    </ol>
  );
}
