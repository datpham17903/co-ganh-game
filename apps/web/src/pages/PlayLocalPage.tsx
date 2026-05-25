import { Link } from 'react-router-dom';

export function PlayLocalPage() {
  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center gap-4">
      <Link to="/" className="self-start text-sm underline">
        ← Menu
      </Link>
      <h1 className="font-display text-2xl">Chơi 2 người</h1>
      <p className="text-text-muted">Bàn cờ sẽ render ở Phase 2 board.</p>
    </div>
  );
}
