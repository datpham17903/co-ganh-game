import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BotDifficulty } from '@co-ganh/bot';
import type { Color } from '@co-ganh/engine';
import { isGameOver, getWinner } from '@co-ganh/engine';
import { Board } from '../features/board/Board.js';
import { useBoardInteraction } from '../features/board/useBoardInteraction.js';
import { useGameStore } from '../stores/gameStore.js';
import { useSettingsStore } from '../stores/settingsStore.js';
import { Modal } from '../components/Modal.js';
import { useBotMove } from '../features/bot/useBotMove.js';
import { MoveHistory } from '../features/game/MoveHistory.js';
import { useGameSound } from '../features/game/useGameSound.js';
import { audio } from '../lib/audio.js';

export function PlayBotPage() {
  const [pickerOpen, setPickerOpen] = useState(true);
  const [difficulty, setDifficulty] = useState<BotDifficulty>(
    useSettingsStore.getState().botDifficulty,
  );
  const [myColor, setMyColor] = useState<Color>('B');
  const [started, setStarted] = useState(false);

  const reset = useGameStore((s) => s.resetGame);

  const onStart = () => {
    useSettingsStore.getState().setBotDifficulty(difficulty);
    reset({ mode: 'bot', myColor });
    setPickerOpen(false);
    setStarted(true);
    audio.arm();
  };

  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-3 gap-4">
        <Link to="/" className="self-start text-sm underline">
          ← Menu
        </Link>
        <Modal open={pickerOpen} onClose={() => undefined} title="Chơi với BOT">
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">Độ khó</p>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 px-3 py-2 rounded border ${
                      difficulty === d ? 'border-accent bg-accent text-white' : 'border-text-muted'
                    }`}
                    data-testid={`diff-${d}`}
                  >
                    {d === 'easy' ? 'Dễ' : d === 'medium' ? 'TBình' : 'Khó'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm mb-2">Màu quân</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMyColor('B')}
                  className={`flex-1 px-3 py-2 rounded border ${
                    myColor === 'B' ? 'border-accent bg-accent text-white' : 'border-text-muted'
                  }`}
                  data-testid="color-B"
                >
                  Đen (đi trước)
                </button>
                <button
                  type="button"
                  onClick={() => setMyColor('W')}
                  className={`flex-1 px-3 py-2 rounded border ${
                    myColor === 'W' ? 'border-accent bg-accent text-white' : 'border-text-muted'
                  }`}
                  data-testid="color-W"
                >
                  Trắng
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="w-full px-4 py-2 rounded bg-accent text-white"
              data-testid="start-game"
            >
              Bắt đầu
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  return <ActiveBotGame difficulty={difficulty} onChangeSetup={() => setStarted(false)} />;
}

function ActiveBotGame({
  difficulty,
  onChangeSetup,
}: {
  difficulty: BotDifficulty;
  onChangeSetup: () => void;
}) {
  const reset = useGameStore((s) => s.resetGame);
  const myColor = useGameStore((s) => s.myColor);
  const { state, selectedFrom, legalDestinations, handlePieceClick, handleCellClick } =
    useBoardInteraction();

  const inputLocked = useGameStore((s) => s.inputLocked);
  const blackPieces = state.board.filter((c) => c === 'B').length;
  const whitePieces = state.board.filter((c) => c === 'W').length;
  const over = isGameOver(state);
  const winner = getWinner(state);

  useBotMove({
    enabled: true,
    config: { difficulty, maxThinkMs: difficulty === 'hard' ? 1500 : 500 },
    thinkingDelayMs: difficulty === 'easy' ? 300 : difficulty === 'medium' ? 500 : 800,
  });
  useGameSound();

  // Khi user đổi màu trắng, bot (đen) đi trước — useBotMove handle.
  useEffect(() => {
    /* trigger via deps */
  }, [myColor]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-3">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link to="/" className="text-sm underline">
          ← Menu
        </Link>
        <h1 className="font-display text-xl">
          Chơi với BOT ({difficulty === 'easy' ? 'Dễ' : difficulty === 'medium' ? 'TBình' : 'Khó'})
        </h1>
        <button type="button" onClick={onChangeSetup} className="text-sm underline">
          Đổi
        </button>
      </div>

      <div className="w-full max-w-2xl flex items-center justify-between mt-3 mb-3">
        <PlayerBadge
          color="B"
          count={blackPieces}
          active={state.turn === 'B' && !over}
          isMe={myColor === 'B'}
          thinking={state.turn === 'B' && myColor !== 'B' && inputLocked}
        />
        <PlayerBadge
          color="W"
          count={whitePieces}
          active={state.turn === 'W' && !over}
          isMe={myColor === 'W'}
          thinking={state.turn === 'W' && myColor !== 'W' && inputLocked}
        />
      </div>

      <Board
        state={state}
        selectedFrom={selectedFrom}
        legalDestinations={legalDestinations}
        onPieceClick={handlePieceClick}
        onCellClick={handleCellClick}
      />

      <p className="mt-3 text-sm text-text-muted" data-testid="turn-indicator">
        {over
          ? winner === 'draw'
            ? 'Hòa'
            : winner === myColor
              ? 'Bạn thắng'
              : 'Bot thắng'
          : state.turn === myColor
            ? 'Lượt bạn'
            : 'Bot đang nghĩ...'}
      </p>

      <details className="w-full max-w-2xl mt-4 px-3">
        <summary className="text-sm cursor-pointer">Lịch sử nước đi</summary>
        <div className="mt-2">
          <MoveHistory />
        </div>
      </details>

      <Modal
        open={over}
        onClose={() => reset({ mode: 'bot', myColor })}
        title={winner === 'draw' ? 'Hòa cờ' : winner === myColor ? 'Bạn thắng' : 'Bot thắng'}
      >
        <div className="space-y-3">
          <p className="text-sm">Số nước đi: {state.moveHistory.length}</p>
          {state.drawReason && <p className="text-sm">Lý do: {state.drawReason}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => reset({ mode: 'bot', myColor })}
              className="flex-1 px-4 py-2 rounded bg-accent text-white"
            >
              Đấu lại
            </button>
            <button
              type="button"
              onClick={onChangeSetup}
              className="flex-1 px-4 py-2 rounded border border-text-muted"
            >
              Đổi độ khó
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PlayerBadge({
  color,
  count,
  active,
  isMe,
  thinking,
}: {
  color: 'B' | 'W';
  count: number;
  active: boolean;
  isMe: boolean;
  thinking: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-md border ${active ? 'border-accent bg-surface' : 'border-text-muted'}`}
      data-testid={`badge-${color}`}
    >
      <span className="text-sm">{isMe ? 'Bạn' : 'Bot'}</span>
      <span className="ml-2 text-xs text-text-muted">({color === 'B' ? 'Đen' : 'Trắng'})</span>
      <span className="ml-2 font-num">{count}</span>
      {thinking && <span className="ml-2 text-accent animate-pulse">...</span>}
    </div>
  );
}
