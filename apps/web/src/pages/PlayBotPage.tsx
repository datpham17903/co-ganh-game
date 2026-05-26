import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useT } from '../i18n/index.js';

export function PlayBotPage() {
  const t = useT();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<BotDifficulty>(
    useSettingsStore.getState().botDifficulty,
  );
  const [myColor, setMyColor] = useState<Color>('B');
  const [started, setStarted] = useState(false);

  const reset = useGameStore((s) => s.resetGame);

  const onStart = () => {
    useSettingsStore.getState().setBotDifficulty(difficulty);
    reset({ mode: 'bot', myColor });
    setStarted(true);
    audio.arm();
  };

  const onCloseSetup = () => navigate('/');

  const diffLabel = (d: BotDifficulty) =>
    d === 'easy'
      ? t('difficulty.easy')
      : d === 'medium'
        ? t('difficulty.medium')
        : t('difficulty.hard');

  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-3 gap-4">
        <Link to="/" className="self-start text-sm underline">
          {t('common.back')}
        </Link>
        <Modal open={true} onClose={onCloseSetup} title={t('bot.title')}>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">{t('settings.botDifficulty')}</p>
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
                    {diffLabel(d)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm mb-2">{t('bot.color')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMyColor('B')}
                  className={`flex-1 px-3 py-2 rounded border ${
                    myColor === 'B' ? 'border-accent bg-accent text-white' : 'border-text-muted'
                  }`}
                  data-testid="color-B"
                >
                  {t('bot.colorBlack')}
                </button>
                <button
                  type="button"
                  onClick={() => setMyColor('W')}
                  className={`flex-1 px-3 py-2 rounded border ${
                    myColor === 'W' ? 'border-accent bg-accent text-white' : 'border-text-muted'
                  }`}
                  data-testid="color-W"
                >
                  {t('bot.colorWhite')}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="w-full px-4 py-2 rounded bg-accent text-white"
              data-testid="start-game"
            >
              {t('common.start')}
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
  const t = useT();
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

  useEffect(() => {
    /* trigger via deps */
  }, [myColor]);

  const diffLabel =
    difficulty === 'easy'
      ? t('difficulty.easy')
      : difficulty === 'medium'
        ? t('difficulty.medium')
        : t('difficulty.hard');

  return (
    <div className="min-h-screen flex flex-col items-center px-2 sm:px-4 py-3">
      <div className="w-full max-w-2xl flex items-center justify-between gap-2">
        <Link to="/" className="text-sm underline shrink-0">
          {t('common.back')}
        </Link>
        <h1 className="font-display text-sm sm:text-xl truncate min-w-0">
          {t('bot.title')} ({diffLabel})
        </h1>
        <button type="button" onClick={onChangeSetup} className="text-sm underline shrink-0">
          {t('common.changeSetup')}
        </button>
      </div>

      <div className="w-full max-w-2xl flex items-center justify-between gap-2 mt-3 mb-3">
        <PlayerBadge
          color="B"
          count={blackPieces}
          active={state.turn === 'B' && !over}
          isMe={myColor === 'B'}
          thinking={state.turn === 'B' && myColor !== 'B' && inputLocked}
          t={t}
        />
        <PlayerBadge
          color="W"
          count={whitePieces}
          active={state.turn === 'W' && !over}
          isMe={myColor === 'W'}
          thinking={state.turn === 'W' && myColor !== 'W' && inputLocked}
          t={t}
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
            ? t('result.draw')
            : winner === myColor
              ? t('result.youWin')
              : t('result.youLose')
          : state.turn === myColor
            ? t('turn.you')
            : t('turn.bot')}
      </p>

      <details className="w-full max-w-2xl mt-4 px-3">
        <summary className="text-sm cursor-pointer">{t('common.history')}</summary>
        <div className="mt-2">
          <MoveHistory />
        </div>
      </details>

      <Modal
        open={over}
        onClose={() => reset({ mode: 'bot', myColor })}
        title={
          winner === 'draw'
            ? t('result.draw')
            : winner === myColor
              ? t('result.youWin')
              : t('result.youLose')
        }
      >
        <div className="space-y-3">
          <p className="text-sm">
            {t('common.movesCount')}: {state.moveHistory.length}
          </p>
          {state.drawReason && <p className="text-sm">{state.drawReason}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => reset({ mode: 'bot', myColor })}
              className="flex-1 px-4 py-2 rounded bg-accent text-white"
            >
              {t('common.replay')}
            </button>
            <button
              type="button"
              onClick={onChangeSetup}
              className="flex-1 px-4 py-2 rounded border border-text-muted"
            >
              {t('common.changeDifficulty')}
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
  t,
}: {
  color: 'B' | 'W';
  count: number;
  active: boolean;
  isMe: boolean;
  thinking: boolean;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div
      className={`flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md border ${active ? 'border-accent bg-surface' : 'border-text-muted'}`}
      data-testid={`badge-${color}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`shrink-0 w-2 h-2 rounded-full ${color === 'B' ? 'bg-text-primary' : 'bg-white border border-text-muted'}`}
          aria-label={color === 'B' ? t('common.black') : t('common.white')}
        />
        <span className="text-sm truncate min-w-0 flex-1">
          {isMe ? t('common.you') : t('common.bot')}
        </span>
        <span className="shrink-0 font-num text-sm">{count}</span>
      </div>
      {thinking && (
        <div className="mt-0.5 text-xs text-accent animate-pulse">{t('bot.thinking')}</div>
      )}
    </div>
  );
}
