import { useEffect, useRef, useState } from 'react';
import { getConversation, sendMessage, startConversation } from '../../api/assistant';
import type { ChatMessage } from '../../api/assistant';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { getErrorMessage } from '../../utils/request';

const SUGGESTION_KEYS = {
  customer: [
    'assistant.suggestCustomer1',
    'assistant.suggestCustomer2',
    'assistant.suggestCustomer3'
  ],
  admin: [
    'assistant.suggestAdmin1',
    'assistant.suggestAdmin2',
    'assistant.suggestAdmin3'
  ]
};



const AssistantWidget = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'admin';
  const suggestions = SUGGESTION_KEYS[isAdmin ? 'admin' : 'customer'];
  const userId = user?.id ?? 'guest';

  useEffect(() => {
    let cancelled = false;
    setLoadingConversation(true);

    getConversation()
      .then((conversation) => {
        if (cancelled) return;
        setConversationId(conversation?.id ?? null);
        setMessages(conversation?.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setConversationId(null);
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversation(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;

    const previous = messages;
    setMessages([...previous, { role: 'user', text }]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const data = await sendMessage(conversationId, text);
      setConversationId(data.conversationId);
      setMessages(data.messages);
    } catch (err) {
      setMessages(previous);
      setError(getErrorMessage(err, t('assistant.error')));
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    try {
      const conversation = await startConversation();
      setConversationId(conversation.id);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, t('assistant.error')));
    }
  };

  return (
    <>
      {open && (
        <section className="assistant-panel" role="dialog" aria-label={t('assistant.title')}>
          <header className="assistant-panel__head">
            <span className="assistant-panel__avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 13a8 8 0 0 1 16 0" />
                <rect x="2.5" y="13" width="4" height="7" rx="1.6" />
                <rect x="17.5" y="13" width="4" height="7" rx="1.6" />
                <path d="M19.5 20a4 4 0 0 1-4 3h-2" />
              </svg>
            </span>
            <span className="assistant-panel__title">
              <strong>{isAdmin ? t('assistant.titleAdmin') : t('assistant.titleCustomer')}</strong>
              <small>{t('assistant.subtitle')}</small>
            </span>
            <button
              type="button"
              className="assistant-icon-btn"
              onClick={startNewConversation}
              aria-label={t('assistant.reset')}
              title={t('assistant.reset')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10a8 8 0 1 1 2 6" />
                <path d="M4 4v6h6" />
              </svg>
            </button>
            <button
              type="button"
              className="assistant-icon-btn"
              onClick={() => setOpen(false)}
              aria-label={t('assistant.close')}
              title={t('assistant.close')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="assistant-panel__body" ref={listRef} aria-live="polite">
            {messages.length === 0 && !loading && !loadingConversation && (
              <div className="assistant-suggestions">
                <p className="assistant-intro">
                  {isAdmin ? t('assistant.introAdmin') : t('assistant.introCustomer')}
                </p>
                {suggestions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="assistant-suggestion"
                    onClick={() => send(t(key))}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`assistant-msg assistant-msg--${message.role}`}
              >
                {message.text}
              </p>
            ))}

            {loading && (
              <span className="assistant-typing" aria-label={t('assistant.thinking')}>
                <span />
                <span />
                <span />
              </span>
            )}
          </div>

          {error && <p className="assistant-error" role="alert">{error}</p>}

          <form
            className="assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('assistant.placeholder')}
              aria-label={t('assistant.placeholder')}
              maxLength={500}
              disabled={loading}
            />
            <button
              type="submit"
              className="assistant-send"
              disabled={loading || input.trim().length === 0}
              aria-label={t('assistant.send')}
              title={t('assistant.send')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 3L10 14" />
                <path d="M21 3l-7 18-4-7-7-4z" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`assistant-fab${open ? ' assistant-fab--open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? t('assistant.close') : t('assistant.open')}
        aria-expanded={open}
        title={open ? t('assistant.close') : t('assistant.open')}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13a8 8 0 0 1 16 0" />
            <rect x="2.5" y="13" width="4" height="7" rx="1.6" />
            <rect x="17.5" y="13" width="4" height="7" rx="1.6" />
            <path d="M19.5 20a4 4 0 0 1-4 3h-2" />
          </svg>
        )}
      </button>
    </>
  );
};

export default AssistantWidget;
