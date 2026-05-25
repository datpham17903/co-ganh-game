import { HIGHLIGHT_RADIUS, pointXY } from './geometry.js';

interface BoardOverlayProps {
  legalDestinations: number[];
  onCellClick: (index: number) => void;
}

export function BoardOverlay({ legalDestinations, onCellClick }: BoardOverlayProps) {
  return (
    <g>
      {legalDestinations.map((idx) => {
        const { x, y } = pointXY(idx);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={HIGHLIGHT_RADIUS}
            fill="#2E7D32"
            opacity={0.5}
            onClick={(e) => {
              e.stopPropagation();
              onCellClick(idx);
            }}
            style={{ cursor: 'pointer' }}
            data-testid={`legal-${idx}`}
          />
        );
      })}
    </g>
  );
}
