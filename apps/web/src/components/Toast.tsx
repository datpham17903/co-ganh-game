import { useToastStore } from '../stores/toastStore.js';

const COLORS: Record<string, string> = {
  info: 'bg-surface text-text-primary border-text-muted',
  success: 'bg-accent-2 text-white border-accent-2',
  warning: 'bg-yellow-200 text-text-primary border-yellow-500',
  error: 'bg-accent text-white border-accent',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4"
      role="region"
      aria-label="Thông báo"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`px-4 py-2 rounded-md border shadow-md text-sm text-left ${COLORS[t.type] ?? COLORS.info}`}
          data-testid={`toast-${t.type}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
