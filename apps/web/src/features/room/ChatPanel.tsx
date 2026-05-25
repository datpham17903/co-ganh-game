import { useEffect, useRef, useState } from 'react';
import { emit, getSocket, SocketEvents, type ChatMessage } from '../../lib/socket.js';
import { useToastStore } from '../../stores/toastStore.js';
import { useT } from '../../i18n/index.js';

interface ChatPanelProps {
  myColor: 'B' | 'W';
}

export function ChatPanel({ myColor }: ChatPanelProps) {
  const t = useT();
  const pushToast = useToastStore((s) => s.push);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const onNew = (d: { message: ChatMessage }) => {
      setMessages((prev) => [...prev, d.message]);
    };
    const onHistory = (d: { messages: ChatMessage[] }) => {
      setMessages(d.messages);
    };

    s.on(SocketEvents.CHAT_NEW, onNew);
    s.on(SocketEvents.CHAT_HISTORY, onHistory);

    return () => {
      s.off(SocketEvents.CHAT_NEW, onNew);
      s.off(SocketEvents.CHAT_HISTORY, onHistory);
    };
  }, []);

  // Auto-scroll xuống cuối khi có msg mới
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (trimmed.length > 200) return;
    setBusy(true);
    try {
      const resp = await emit<{ ok: boolean; error?: string }>(
        getSocket(),
        SocketEvents.CHAT_MESSAGE,
        { text: trimmed },
      );
      if (!resp.ok) {
        if (resp.error === 'RATE_LIMIT') pushToast('warning', t('chat.rateLimit'));
        else pushToast('error', resp.error ?? 'CHAT_FAIL');
        return;
      }
      setText('');
    } catch {
      pushToast('error', t('pvp.errConn'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="w-full max-w-2xl mt-4 rounded-lg border border-text-muted/40 bg-surface/40"
      data-testid="chat-panel"
    >
      <header className="px-3 py-2 border-b border-text-muted/30">
        <h2 className="text-sm font-medium">{t('chat.title')}</h2>
      </header>
      <ul
        ref={listRef}
        className="px-3 py-2 max-h-40 overflow-y-auto space-y-1 text-sm"
        data-testid="chat-messages"
      >
        {messages.length === 0 ? (
          <li className="text-text-muted italic">{t('chat.empty')}</li>
        ) : (
          messages.map((m) => (
            <li key={m.id} className="break-words">
              <span
                className={
                  m.from === myColor
                    ? 'font-medium text-accent'
                    : m.from === 'system'
                      ? 'italic text-text-muted'
                      : 'font-medium text-accent-2'
                }
              >
                {m.name}:
              </span>{' '}
              <span>{m.text}</span>
            </li>
          ))
        )}
      </ul>
      <form
        className="flex gap-2 px-3 py-2 border-t border-text-muted/30"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 200))}
          placeholder={t('chat.placeholder')}
          maxLength={200}
          className="flex-1 px-2 py-1 border border-text-muted/50 rounded bg-surface text-sm"
          data-testid="chat-input"
        />
        <button
          type="submit"
          disabled={busy || text.trim().length === 0}
          className="px-3 py-1 rounded bg-accent text-white text-sm disabled:opacity-50"
          data-testid="chat-send"
        >
          {t('chat.send')}
        </button>
      </form>
    </div>
  );
}
