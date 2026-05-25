import { Link } from 'react-router-dom';

export function PlayPvPPage() {
  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center gap-4">
      <Link to="/" className="self-start text-sm underline">
        ← Menu
      </Link>
      <h1 className="font-display text-2xl">Chơi online</h1>
      <p className="text-text-muted">Sảnh PvP sẽ được nối ở Phase 4.</p>
    </div>
  );
}
