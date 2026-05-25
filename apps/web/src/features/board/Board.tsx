import { TOTAL_CELLS, type GameState } from '@co-ganh/engine';
import { Piece } from './Piece.js';
import { BoardOverlay } from './BoardOverlay.js';
import { SVG_SIZE, computeEdges, isDiagonalEdge, pointXY } from './geometry.js';

interface BoardProps {
  state: GameState;
  selectedFrom: number | null;
  legalDestinations: number[];
  onPieceClick: (index: number) => void;
  onCellClick: (index: number) => void;
}

const EDGES = computeEdges();

export function Board({
  state,
  selectedFrom,
  legalDestinations,
  onPieceClick,
  onCellClick,
}: BoardProps) {
  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className="w-full max-w-[500px] aspect-square"
      role="img"
      aria-label="Bàn cờ gánh 5×5"
      data-testid="board"
    >
      <defs>
        <radialGradient id="piece-grad-black" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#444" />
          <stop offset="100%" stopColor="#0A0A0A" />
        </radialGradient>
        <radialGradient id="piece-grad-white" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFCF4" />
          <stop offset="100%" stopColor="#D9CFB8" />
        </radialGradient>
      </defs>

      <rect
        x={0}
        y={0}
        width={SVG_SIZE}
        height={SVG_SIZE}
        fill="#D9B074"
        rx={12}
        onClick={() => onCellClick(-1)}
        style={{ cursor: 'default' }}
      />

      <g stroke="#6B3F1D" strokeWidth={2} strokeLinecap="round">
        {EDGES.map((e) => {
          const a = pointXY(e.a);
          const b = pointXY(e.b);
          const diag = isDiagonalEdge(e.a, e.b);
          return (
            <line
              key={`${e.a}-${e.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={diag ? 1.5 : 2}
              opacity={diag ? 0.7 : 1}
            />
          );
        })}
      </g>

      <g>
        {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
          const { x, y } = pointXY(idx);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={3}
              fill="#6B3F1D"
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(idx);
              }}
              style={{ cursor: 'pointer' }}
              data-testid={`cell-${idx}`}
            />
          );
        })}
      </g>

      <BoardOverlay legalDestinations={legalDestinations} onCellClick={onCellClick} />

      <g>
        {state.board.map((cell, idx) =>
          cell ? (
            <Piece
              key={idx}
              index={idx}
              color={cell}
              selected={selectedFrom === idx}
              onClick={onPieceClick}
            />
          ) : null,
        )}
      </g>
    </svg>
  );
}
