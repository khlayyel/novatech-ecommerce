import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

const DEMO_CREDENTIALS = { email: 'demo@novatech.fr', password: 'Demo1234!' };

/** Connexion (bonus JWT) — redirige vers la page demandée après authentification. */
const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Renseignez votre email et votre mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email, password);
      // Un administrateur arrive directement sur son back-office.
      navigate(user.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-layout">
      <section className="card auth-card">
        <h1 className="auth-card__title">{t('auth.loginTitle')}</h1>
        <p className="muted">{t('auth.loginSubtitle')}</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">{t('auth.email')}</span>
            <input
              type="email"
              className="input"
              placeholder="vous@exemple.fr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">{t('auth.password')}</span>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button--primary button--full button--lg" disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.submit')}
          </button>
        </form>

        <button
          type="button"
          className="auth-card__demo button button--ghost button--sm"
          onClick={() => {
            setEmail(DEMO_CREDENTIALS.email);
            setPassword(DEMO_CREDENTIALS.password);
          }}
        >
          {t('auth.demoFill')}
        </button>

        <p className="auth-card__switch">
          {t('auth.noAccount')} <Link to="/register">{t('auth.createAccount')}</Link>
        </p>
      </section>
    </div>
  );
};

export default LoginPage;
