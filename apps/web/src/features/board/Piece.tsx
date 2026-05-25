import type { Color } from '@co-ganh/engine';
import { PIECE_RADIUS, pointXY } from './geometry.js';

interface PieceProps {
  index: number;
  color: Color;
  selected: boolean;
  onClick: (index: number) => void;
}

const COLOR_FILL: Record<Color, string> = {
  B: 'url(#piece-grad-black)',
  W: 'url(#piece-grad-white)',
};

const COLOR_STROKE: Record<Color, string> = {
  B: '#000',
  W: '#999',
};

export function Piece({ index, color, selected, onClick }: PieceProps) {
  const { x, y } = pointXY(index);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Quân ${color === 'B' ? 'đen' : 'trắng'} tại điểm ${index}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(index);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(index);
        }
      }}
      style={{ cursor: 'pointer' }}
      data-testid={`piece-${index}`}
      data-color={color}
      data-selected={selected ? 'true' : 'false'}
    >
      <circle
        cx={x}
        cy={y}
        r={PIECE_RADIUS}
        fill={COLOR_FILL[color]}
        stroke={selected ? '#C0392B' : COLOR_STROKE[color]}
        strokeWidth={selected ? 4 : 2}
      />
    </g>
  );
}
